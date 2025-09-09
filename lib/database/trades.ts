"use server";
import { prisma } from '@/lib/prisma';
import { TradeType, TradeStatus } from '@prisma/client';

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

// Create a new trade
export async function createTrade(data: CreateTradeData) {
  try {
    // Validate commodity exists
    const commodity = await prisma.commodity.findUnique({
      where: { id: data.commodityId }
    });
    
    if (!commodity) {
      throw new Error('Commodity not found');
    }

    // Validate counterparty exists
    const counterparty = await prisma.counterparty.findUnique({
      where: { id: data.counterpartyId }
    });
    
    if (!counterparty) {
      throw new Error('Counterparty not found');
    }

    // Calculate total value
    const totalValue = data.quantity * data.price;

    // Check counterparty credit limit
    const newCreditUsed = counterparty.creditUsed + totalValue;
    if (newCreditUsed > counterparty.creditLimit) {
      throw new Error('Trade exceeds counterparty credit limit');
    }

    // Create trade in transaction
    const trade = await prisma.$transaction(async (tx) => {
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
        }
      });

      // Update counterparty credit usage and trade count
      await tx.counterparty.update({
        where: { id: data.counterpartyId },
        data: {
          creditUsed: newCreditUsed,
          totalTrades: { increment: 1 },
          totalVolume: { increment: data.quantity },
          lastTradeDate: new Date(),
        }
      });

      return newTrade;
    });

    return trade;
  } catch (error) {
    console.error('Error creating trade:', error);
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
      },
      orderBy: { tradeDate: 'desc' },
      take: filters?.limit || 100,
      skip: filters?.offset || 0,
    });

    return trades;
  } catch (error) {
    console.error('Error fetching trades:', error);
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
          }
        },
      }
    });

    if (!trade) {
      throw new Error('Trade not found');
    }

    return trade;
  } catch (error) {
    console.error('Error fetching trade:', error);
    throw error;
  }
}

// Update trade
export async function updateTrade(id: string, data: UpdateTradeData) {
  try {
    const existingTrade = await prisma.trade.findUnique({
      where: { id },
      include: { commodity: true }
    });

    if (!existingTrade) {
      throw new Error('Trade not found');
    }

    // Calculate new total value if quantity or price changed
    let totalValue = existingTrade.totalValue;
    if (data.quantity !== undefined || data.price !== undefined) {
      const newQuantity = data.quantity ?? existingTrade.quantity;
      const newPrice = data.price ?? existingTrade.price;
      totalValue = newQuantity * newPrice;
    }

    const updatedTrade = await prisma.trade.update({
      where: { id },
      data: {
        ...data,
        totalValue,
        updatedAt: new Date(),
      },
      include: {
        commodity: true,
        user: true,
        shipments: true,
      }
    });

    return updatedTrade;
  } catch (error) {
    console.error('Error updating trade:', error);
    throw error;
  }
}

// Execute trade (change status to EXECUTED)
export async function executeTrade(id: string) {
  try {
    const trade = await prisma.trade.findUnique({
      where: { id },
      include: { commodity: true }
    });

    if (!trade) {
      throw new Error('Trade not found');
    }

    if (trade.status !== TradeStatus.OPEN) {
      throw new Error('Only open trades can be executed');
    }

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
        }
      });

      // If it's a BUY trade, add to inventory
      if (trade.type === TradeType.BUY) {
        // Check if inventory item already exists for this commodity
        const existingInventory = await tx.inventoryItem.findFirst({
          where: {
            commodityId: trade.commodityId,
            // You might want to add warehouse/location matching here
          }
        });

        if (existingInventory) {
          // Update existing inventory
          const newQuantity = existingInventory.quantity + trade.quantity;
          const newCostBasis = ((existingInventory.quantity * existingInventory.costBasis) + 
                               (trade.quantity * trade.price)) / newQuantity;

          await tx.inventoryItem.update({
            where: { id: existingInventory.id },
            data: {
              quantity: newQuantity,
              costBasis: newCostBasis,
              lastUpdated: new Date(),
            }
          });
        } else {
          // Create new inventory item
          await tx.inventoryItem.create({
            data: {
              commodityId: trade.commodityId,
              quantity: trade.quantity,
              unit: trade.commodity.unit,
              warehouse: 'Main Warehouse', // Default warehouse
              location: trade.location,
              quality: 'Standard', // Default quality
              costBasis: trade.price,
              marketValue: trade.commodity.currentPrice,
            }
          });
        }
      }

      return updatedTrade;
    });

    return executedTrade;
  } catch (error) {
    console.error('Error executing trade:', error);
    throw error;
  }
}

// Cancel trade
export async function cancelTrade(id: string, reason?: string) {
  try {
    const trade = await prisma.trade.findUnique({
      where: { id }
    });

    if (!trade) {
      throw new Error('Trade not found');
    }

    if (trade.status !== TradeStatus.OPEN) {
      throw new Error('Only open trades can be cancelled');
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
        }
      });

      // Reverse counterparty credit usage
      const counterparty = await tx.counterparty.findUnique({
        where: { id: trade.counterpartyId }
      });

      if (counterparty) {
        await tx.counterparty.update({
          where: { id: trade.counterpartyId },
          data: {
            creditUsed: Math.max(0, counterparty.creditUsed - trade.totalValue),
            totalTrades: Math.max(0, counterparty.totalTrades - 1),
            totalVolume: Math.max(0, counterparty.totalVolume - trade.quantity),
          }
        });
      }

      return updatedTrade;
    });

    return cancelledTrade;
  } catch (error) {
    console.error('Error cancelling trade:', error);
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
        _sum: { quantity: true }
      }),
      prisma.trade.aggregate({
        where,
        _sum: { totalValue: true }
      }),
      prisma.trade.count({ where: { ...where, status: TradeStatus.OPEN } }),
      prisma.trade.count({ where: { ...where, status: TradeStatus.EXECUTED } }),
      prisma.trade.count({ where: { ...where, status: TradeStatus.SETTLED } }),
      prisma.trade.count({ where: { ...where, status: TradeStatus.CANCELLED } }),
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
    console.error('Error fetching trade statistics:', error);
    throw error;
  }
}