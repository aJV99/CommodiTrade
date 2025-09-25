"use server";
import { prisma } from "@/lib/prisma";
import { TradeType, TradeStatus } from "@prisma/client";
import { processInventoryMovement } from "@/lib/database/inventory";

export interface CreateTradeData {
  commodityId: string;
  type: TradeType;
  quantity: number;
  price: number;
  counterpartyId: string;
  settlementDate: Date;
  location: string;
  userId?: string;
}

export interface UpdateTradeData {
  quantity?: number;
  price?: number;
  status?: TradeStatus;
  settlementDate?: Date;
  location?: string;
}

export interface ExecuteTradeOptions {
  id: string;
  warehouse?: string;
  quality?: string;
  location?: string;
}

// Create a new trade
export async function createTrade(data: CreateTradeData) {
  try {
    // Validate commodity exists
    const commodity = await prisma.commodity.findUnique({
      where: { id: data.commodityId },
    });

    if (!commodity) {
      throw new Error("Commodity not found");
    }

    // Calculate total value
    const totalValue = data.quantity * data.price;

    // Create trade in transaction
    const trade = await prisma.$transaction(async (tx) => {
      const counterparty = await tx.counterparty.findUnique({
        where: { id: data.counterpartyId },
        select: {
          id: true,
          creditLimit: true,
          creditUsed: true,
        },
      });

      if (!counterparty) {
        throw new Error("Counterparty not found");
      }

      const newCreditUsed = counterparty.creditUsed + totalValue;
      if (newCreditUsed > counterparty.creditLimit) {
        throw new Error("Trade exceeds counterparty credit limit");
      }

      // Create the trade
      const newTrade = await tx.trade.create({
        data: {
          ...data,
          totalValue,
          status: TradeStatus.OPEN,
          // counterparty: { connect: { id: data.counterpartyId } },
        },
        include: {
          commodity: true,
          user: true,
        },
      });

      // Update counterparty credit usage and trade count
      await tx.counterparty.update({
        where: { id: data.counterpartyId },
        data: {
          creditUsed: newCreditUsed,
          totalTrades: { increment: 1 },
          totalVolume: { increment: data.quantity },
          lastTradeDate: new Date(),
        },
      });

      return newTrade;
    });

    return trade;
  } catch (error) {
    console.error("Error creating trade:", error);
    throw error;
  }
}

// Get all trades with filtering and pagination
export async function getTrades(filters?: {
  status?: TradeStatus;
  type?: TradeType;
  commodityId?: string;
  counterpartyId?: string;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}) {
  try {
    const where: any = {};

    if (filters?.status) where.status = filters.status;
    if (filters?.type) where.type = filters.type;
    if (filters?.commodityId) where.commodityId = filters.commodityId;
    if (filters?.counterpartyId) where.counterpartyId = filters.counterpartyId;
    if (filters?.userId) where.userId = filters.userId;

    if (filters?.dateFrom || filters?.dateTo) {
      where.tradeDate = {};
      if (filters.dateFrom) where.tradeDate.gte = filters.dateFrom;
      if (filters.dateTo) where.tradeDate.lte = filters.dateTo;
    }

    const trades = await prisma.trade.findMany({
      where,
      include: {
        commodity: true,
        user: true,
        shipments: true,
        counterparty: true,
      },
      orderBy: { tradeDate: "desc" },
      take: filters?.limit || 100,
      skip: filters?.offset || 0,
    });

    return trades;
  } catch (error) {
    console.error("Error fetching trades:", error);
    throw error;
  }
}

// Get trade by ID with full details
export async function getTradeById(id: string) {
  try {
    const trade = await prisma.trade.findUnique({
      where: { id },
      include: {
        commodity: true,
        counterparty: true,
        user: true,
        shipments: {
          include: {
            commodity: true,
          },
        },
      },
    });

    if (!trade) {
      throw new Error("Trade not found");
    }

    return trade;
  } catch (error) {
    console.error("Error fetching trade:", error);
    throw error;
  }
}

// Update trade
export async function updateTrade(id: string, data: UpdateTradeData) {
  try {
    return await prisma.$transaction(async (tx) => {
      const existingTrade = await tx.trade.findUnique({
        where: { id },
        include: { commodity: true, counterparty: true },
      });

      if (!existingTrade) {
        throw new Error("Trade not found");
      }

      if (!existingTrade.counterparty) {
        throw new Error("Trade counterparty could not be determined");
      }

      const newQuantity = data.quantity ?? existingTrade.quantity;
      const newPrice = data.price ?? existingTrade.price;
      const nextStatus = data.status ?? existingTrade.status;
      const recalculatedTotalValue = newQuantity * newPrice;

      const exposureStatuses = new Set<TradeStatus>([
        TradeStatus.OPEN,
        TradeStatus.EXECUTED,
      ]);

      let projectedCreditUsed = existingTrade.counterparty.creditUsed;

      if (exposureStatuses.has(existingTrade.status)) {
        projectedCreditUsed -= existingTrade.totalValue;
      }

      if (exposureStatuses.has(nextStatus)) {
        projectedCreditUsed += recalculatedTotalValue;
      }

      if (projectedCreditUsed < 0) {
        projectedCreditUsed = 0;
      }

      if (projectedCreditUsed > existingTrade.counterparty.creditLimit) {
        throw new Error(
          "Updating this trade would exceed the counterparty credit limit",
        );
      }

      const updatedTrade = await tx.trade.update({
        where: { id },
        data: {
          ...data,
          totalValue: recalculatedTotalValue,
          updatedAt: new Date(),
        },
        include: {
          commodity: true,
          user: true,
          shipments: true,
        },
      });

      const volumeDelta = newQuantity - existingTrade.quantity;

      await tx.counterparty.update({
        where: { id: existingTrade.counterpartyId },
        data: {
          creditUsed: projectedCreditUsed,
          totalVolume: Math.max(
            0,
            existingTrade.counterparty.totalVolume + volumeDelta,
          ),
          lastTradeDate: new Date(),
        },
      });

      return updatedTrade;
    });
  } catch (error) {
    console.error("Error updating trade:", error);
    throw error;
  }
}

// Execute trade (change status to EXECUTED)
export async function executeTrade({
  id,
  warehouse,
  quality,
  location,
}: ExecuteTradeOptions) {
  try {
    const trade = await prisma.trade.findUnique({
      where: { id },
      include: { commodity: true },
    });

    if (!trade) {
      throw new Error("Trade not found");
    }

    if (trade.status !== TradeStatus.OPEN) {
      throw new Error("Only open trades can be executed");
    }

    const preferredLocation = location ?? trade.location;
    const preferredWarehouse =
      warehouse ?? preferredLocation ?? "Main Warehouse";
    const preferredQuality = quality ?? "Standard";

    const executedTrade = await prisma.$transaction(async (tx) => {
      // Update trade status
      const updatedTrade = await tx.trade.update({
        where: { id },
        data: {
          status: TradeStatus.EXECUTED,
          updatedAt: new Date(),
        },
        include: {
          commodity: true,
          user: true,
          shipments: true,
        },
      });

      if (trade.type === TradeType.BUY) {
        const existingInventory = await tx.inventoryItem.findFirst({
          where: {
            commodityId: trade.commodityId,
            warehouse: preferredWarehouse,
            location: preferredLocation ?? preferredWarehouse,
            quality: preferredQuality,
          },
        });

        const targetInventory =
          existingInventory ??
          (await tx.inventoryItem.create({
            data: {
              commodityId: trade.commodityId,
              quantity: 0,
              unit: trade.commodity.unit,
              warehouse: preferredWarehouse,
              location: preferredLocation ?? preferredWarehouse,
              quality: preferredQuality,
              costBasis: trade.price,
              marketValue: trade.commodity.currentPrice,
            },
            include: { commodity: true },
          }));

        await processInventoryMovement(
          {
            inventoryId: targetInventory.id,
            type: "IN",
            quantity: trade.quantity,
            reason: `Trade ${trade.id} execution`,
            referenceType: "TRADE",
            referenceId: trade.id,
            unitCost: trade.price,
            unitMarketValue: trade.commodity.currentPrice,
          },
          tx,
        );
      } else {
        const locationFilter = preferredLocation ?? undefined;

        let candidateLots = await tx.inventoryItem.findMany({
          where: {
            commodityId: trade.commodityId,
            ...(preferredWarehouse ? { warehouse: preferredWarehouse } : {}),
            ...(locationFilter ? { location: locationFilter } : {}),
            ...(preferredQuality ? { quality: preferredQuality } : {}),
          },
          orderBy: { lastUpdated: "desc" },
        });

        if (candidateLots.length === 0) {
          candidateLots = await tx.inventoryItem.findMany({
            where: { commodityId: trade.commodityId },
            orderBy: { lastUpdated: "desc" },
          });
        }

        if (candidateLots.length === 0) {
          throw new Error("No inventory available for SELL execution");
        }

        const totalAvailable = candidateLots.reduce(
          (sum, lot) => sum + lot.quantity,
          0,
        );

        if (totalAvailable < trade.quantity) {
          throw new Error(
            "Insufficient inventory to cover this SELL trade quantity",
          );
        }

        const selectedLot = candidateLots.find(
          (lot) => lot.quantity >= trade.quantity,
        );

        if (!selectedLot) {
          throw new Error(
            "No single inventory lot can cover the requested SELL quantity",
          );
        }

        await processInventoryMovement(
          {
            inventoryId: selectedLot.id,
            type: "OUT",
            quantity: trade.quantity,
            reason: `Trade ${trade.id} execution`,
            referenceType: "TRADE",
            referenceId: trade.id,
            unitMarketValue: trade.price,
          },
          tx,
        );
      }

      return updatedTrade;
    });

    return executedTrade;
  } catch (error) {
    console.error("Error executing trade:", error);
    throw error;
  }
}

// Cancel trade
export async function cancelTrade(id: string, reason?: string) {
  try {
    const trade = await prisma.trade.findUnique({
      where: { id },
    });

    if (!trade) {
      throw new Error("Trade not found");
    }

    if (trade.status !== TradeStatus.OPEN) {
      throw new Error("Only open trades can be cancelled");
    }

    const cancelledTrade = await prisma.$transaction(async (tx) => {
      // Update trade status
      const updatedTrade = await tx.trade.update({
        where: { id },
        data: {
          status: TradeStatus.CANCELLED,
          updatedAt: new Date(),
        },
        include: {
          commodity: true,
          user: true,
        },
      });

      // Reverse counterparty credit usage
      const counterparty = await tx.counterparty.findUnique({
        where: { id: trade.counterpartyId },
      });

      if (counterparty) {
        await tx.counterparty.update({
          where: { id: trade.counterpartyId },
          data: {
            creditUsed: Math.max(0, counterparty.creditUsed - trade.totalValue),
            totalTrades: Math.max(0, counterparty.totalTrades - 1),
            totalVolume: Math.max(0, counterparty.totalVolume - trade.quantity),
          },
        });
      }

      return updatedTrade;
    });

    return cancelledTrade;
  } catch (error) {
    console.error("Error cancelling trade:", error);
    throw error;
  }
}

// Get trade statistics
export async function getTradeStatistics(filters?: {
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  try {
    const where: any = {};

    if (filters?.userId) where.userId = filters.userId;
    if (filters?.dateFrom || filters?.dateTo) {
      where.tradeDate = {};
      if (filters.dateFrom) where.tradeDate.gte = filters.dateFrom;
      if (filters.dateTo) where.tradeDate.lte = filters.dateTo;
    }

    const [
      totalTrades,
      totalVolume,
      totalValue,
      openTrades,
      executedTrades,
      settledTrades,
      cancelledTrades,
    ] = await Promise.all([
      prisma.trade.count({ where }),
      prisma.trade.aggregate({
        where,
        _sum: { quantity: true },
      }),
      prisma.trade.aggregate({
        where,
        _sum: { totalValue: true },
      }),
      prisma.trade.count({ where: { ...where, status: TradeStatus.OPEN } }),
      prisma.trade.count({ where: { ...where, status: TradeStatus.EXECUTED } }),
      prisma.trade.count({ where: { ...where, status: TradeStatus.SETTLED } }),
      prisma.trade.count({
        where: { ...where, status: TradeStatus.CANCELLED },
      }),
    ]);

    return {
      totalTrades,
      totalVolume: totalVolume._sum.quantity || 0,
      totalValue: totalValue._sum.totalValue || 0,
      openTrades,
      executedTrades,
      settledTrades,
      cancelledTrades,
    };
  } catch (error) {
    console.error("Error fetching trade statistics:", error);
    throw error;
  }
}
