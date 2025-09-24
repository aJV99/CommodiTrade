"use server";
import { prisma } from '@/lib/prisma';
import {
  InventoryMovementReferenceType,
  InventoryMovementType,
  Prisma,
} from '@prisma/client';
import {
  inventoryCreateSchema,
  inventoryUpdateSchema,
  inventoryMovementSchema,
  InventoryMovementValues,
  InventoryFormValues,
  InventoryUpdateValues,
} from '@/lib/validation/inventory';

export type CreateInventoryData = InventoryFormValues;
export type UpdateInventoryData = InventoryUpdateValues;
export type InventoryMovementInput = InventoryMovementValues;

// Create inventory item
export async function createInventoryItem(data: CreateInventoryData) {
  try {
    const parsed = inventoryCreateSchema.parse(data);

    return await prisma.$transaction(async (tx) => {
      const commodity = await tx.commodity.findUnique({
        where: { id: parsed.commodityId },
      });

      if (!commodity) {
        throw new Error('Commodity not found');
      }

      const where = {
        inventory_item_unique_slot: {
          commodityId: parsed.commodityId,
          warehouse: parsed.warehouse,
          location: parsed.location,
          quality: parsed.quality,
        },
      } as const;

      const existingItem = await tx.inventoryItem.findUnique({
        where,
        include: { commodity: true },
      });

      if (existingItem) {
        const newQuantity = existingItem.quantity + parsed.quantity;
        const newCostBasis =
          (existingItem.quantity * existingItem.costBasis +
            parsed.quantity * parsed.costBasis) /
          newQuantity;

        const updatedItem = await tx.inventoryItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: newQuantity,
            costBasis: newCostBasis,
            marketValue: parsed.marketValue,
            lastUpdated: new Date(),
          },
          include: { commodity: true },
        });

        await tx.inventoryMovement.create({
          data: {
            inventoryId: existingItem.id,
            type: InventoryMovementType.IN,
            quantityDelta: parsed.quantity,
            resultingQuantity: newQuantity,
            reason: 'Lot increased via manual creation',
            referenceType: InventoryMovementReferenceType.MANUAL,
            unitCost: parsed.costBasis,
            unitMarketValue: parsed.marketValue,
          },
        });

        return updatedItem;
      }

      const inventoryItem = await tx.inventoryItem.create({
        data: {
          ...parsed,
          lastUpdated: new Date(),
        },
        include: { commodity: true },
      });

      await tx.inventoryMovement.create({
        data: {
          inventoryId: inventoryItem.id,
          type: InventoryMovementType.IN,
          quantityDelta: parsed.quantity,
          resultingQuantity: parsed.quantity,
          reason: 'Initial lot creation',
          referenceType: InventoryMovementReferenceType.MANUAL,
          unitCost: parsed.costBasis,
          unitMarketValue: parsed.marketValue,
        },
      });

      return inventoryItem;
    });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new Error('Lot already exists—try adjusting stock instead.');
    }
    throw error;
  }
}

// Get all inventory items with filtering
export async function getInventoryItems(filters?: {
  commodityId?: string;
  warehouse?: string;
  location?: string;
  quality?: string;
  minQuantity?: number;
  maxQuantity?: number;
}) {
  try {
    const where: any = {};

    if (filters?.commodityId) where.commodityId = filters.commodityId;
    if (filters?.warehouse) where.warehouse = { contains: filters.warehouse, mode: 'insensitive' };
    if (filters?.location) where.location = { contains: filters.location, mode: 'insensitive' };
    if (filters?.quality) where.quality = filters.quality;
    
    if (filters?.minQuantity !== undefined || filters?.maxQuantity !== undefined) {
      where.quantity = {};
      if (filters.minQuantity !== undefined) where.quantity.gte = filters.minQuantity;
      if (filters.maxQuantity !== undefined) where.quantity.lte = filters.maxQuantity;
    }

    const inventoryItems = await prisma.inventoryItem.findMany({
      where,
      include: {
        commodity: true,
      },
      orderBy: [
        { commodity: { name: 'asc' } },
        { warehouse: 'asc' },
        { location: 'asc' }
      ]
    });

    return inventoryItems;
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    throw error;
  }
}

// Get inventory item by ID
export async function getInventoryItemById(id: string) {
  try {
    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        commodity: true,
      }
    });

    if (!inventoryItem) {
      throw new Error('Inventory item not found');
    }

    return inventoryItem;
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    throw error;
  }
}

// Update inventory item
export async function updateInventoryItem(id: string, data: UpdateInventoryData) {
  try {
    const parsed = inventoryUpdateSchema.parse(data);

    const updatedItem = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...parsed,
        lastUpdated: new Date(),
      },
      include: {
        commodity: true,
      },
    });

    return updatedItem;
  } catch (error) {
    console.error('Error updating inventory item:', error);
    throw error;
  }
}

// Delete inventory item
export async function deleteInventoryItem(id: string) {
  try {
    const deletedItem = await prisma.inventoryItem.delete({
      where: { id },
      include: {
        commodity: true,
      }
    });

    return deletedItem;
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    throw error;
  }
}

// Process inventory movement (IN/OUT/ADJUSTMENT)
async function applyInventoryMovement(
  tx: Prisma.TransactionClient,
  parsed: InventoryMovementValues,
) {
  const inventoryItem = await tx.inventoryItem.findUnique({
    where: { id: parsed.inventoryId },
    include: { commodity: true },
  });

  if (!inventoryItem) {
    throw new Error('Inventory item not found');
  }

  let newQuantity = inventoryItem.quantity;
  let quantityDelta = 0;

  switch (parsed.type) {
    case 'IN':
      newQuantity += parsed.quantity;
      quantityDelta = parsed.quantity;
      break;
    case 'OUT':
      newQuantity -= parsed.quantity;
      quantityDelta = -parsed.quantity;
      if (newQuantity < 0) {
        throw new Error('Insufficient inventory quantity');
      }
      break;
    case 'ADJUSTMENT':
      quantityDelta = parsed.quantity - inventoryItem.quantity;
      newQuantity = parsed.quantity;
      break;
    default:
      throw new Error('Invalid movement type');
  }

  if (newQuantity < 0) {
    throw new Error('Resulting quantity cannot be negative');
  }

  let costBasis = inventoryItem.costBasis;
  if (parsed.type === 'IN' && parsed.unitCost !== undefined) {
    const totalCost =
      inventoryItem.quantity * inventoryItem.costBasis +
      parsed.quantity * parsed.unitCost;
    costBasis = newQuantity > 0 ? totalCost / newQuantity : parsed.unitCost;
  } else if (parsed.type === 'ADJUSTMENT' && parsed.unitCost !== undefined) {
    costBasis = parsed.unitCost;
  }

  const marketValue = parsed.unitMarketValue ?? inventoryItem.marketValue;

  const updatedItem = await tx.inventoryItem.update({
    where: { id: parsed.inventoryId },
    data: {
      quantity: newQuantity,
      costBasis,
      marketValue,
      lastUpdated: new Date(),
    },
    include: {
      commodity: true,
    },
  });

  await tx.inventoryMovement.create({
    data: {
      inventoryId: parsed.inventoryId,
      type: InventoryMovementType[
        parsed.type as keyof typeof InventoryMovementType
      ],
      quantityDelta,
      resultingQuantity: newQuantity,
      reason: parsed.reason,
      referenceType: parsed.referenceType
        ? InventoryMovementReferenceType[
            parsed.referenceType as keyof typeof InventoryMovementReferenceType
          ]
        : undefined,
      referenceId: parsed.referenceId,
      unitCost: parsed.unitCost ?? costBasis,
      unitMarketValue: marketValue,
    },
  });

  return updatedItem;
}

export async function processInventoryMovement(
  movement: InventoryMovementInput,
  tx?: Prisma.TransactionClient,
) {
  try {
    const parsed = inventoryMovementSchema.parse(movement);

    if (tx) {
      return applyInventoryMovement(tx, parsed);
    }

    return prisma.$transaction((transaction) =>
      applyInventoryMovement(transaction, parsed),
    );
  } catch (error) {
    console.error('Error processing inventory movement:', error);
    throw error;
  }
}

export async function getInventoryMovementsForItem(
  inventoryId: string,
  options?: { limit?: number },
) {
  try {
    const movements = await prisma.inventoryMovement.findMany({
      where: { inventoryId },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
    });

    return movements;
  } catch (error) {
    console.error('Error fetching inventory movements:', error);
    throw error;
  }
}

// Get inventory valuation
export async function getInventoryValuation(filters?: {
  commodityId?: string;
  warehouse?: string;
  location?: string;
}) {
  try {
    const where: any = {};

    if (filters?.commodityId) where.commodityId = filters.commodityId;
    if (filters?.warehouse) where.warehouse = { contains: filters.warehouse, mode: 'insensitive' };
    if (filters?.location) where.location = { contains: filters.location, mode: 'insensitive' };

    const inventoryItems = await prisma.inventoryItem.findMany({
      where,
      include: {
        commodity: true,
      }
    });

    const commodityMap = new Map<
      string,
      {
        commodityId: string;
        commodityName: string;
        quantity: number;
        costValue: number;
        marketValue: number;
        unrealizedPnL: number;
      }
    >();

    const warehouseMap = new Map<
      string,
      {
        key: string;
        warehouse: string;
        location: string;
        quantity: number;
        costValue: number;
        marketValue: number;
        unrealizedPnL: number;
      }
    >();

    const valuation = inventoryItems.reduce(
      (acc, item) => {
        const costValue = item.quantity * item.costBasis;
        const marketValue = item.quantity * item.marketValue;
        const unrealizedPnL = marketValue - costValue;

        acc.totalCostValue += costValue;
        acc.totalMarketValue += marketValue;
        acc.totalUnrealizedPnL += unrealizedPnL;
        acc.totalItems += 1;
        acc.totalQuantity += item.quantity;
        acc.latestUpdate = Math.max(
          acc.latestUpdate,
          item.lastUpdated.getTime(),
        );

        const commodityEntry = commodityMap.get(item.commodityId) ?? {
          commodityId: item.commodityId,
          commodityName: item.commodity.name,
          quantity: 0,
          costValue: 0,
          marketValue: 0,
          unrealizedPnL: 0,
        };

        commodityEntry.quantity += item.quantity;
        commodityEntry.costValue += costValue;
        commodityEntry.marketValue += marketValue;
        commodityEntry.unrealizedPnL += unrealizedPnL;

        commodityMap.set(item.commodityId, commodityEntry);

        const warehouseKey = `${item.warehouse}::${item.location}`;
        const warehouseEntry = warehouseMap.get(warehouseKey) ?? {
          key: warehouseKey,
          warehouse: item.warehouse,
          location: item.location,
          quantity: 0,
          costValue: 0,
          marketValue: 0,
          unrealizedPnL: 0,
        };

        warehouseEntry.quantity += item.quantity;
        warehouseEntry.costValue += costValue;
        warehouseEntry.marketValue += marketValue;
        warehouseEntry.unrealizedPnL += unrealizedPnL;

        warehouseMap.set(warehouseKey, warehouseEntry);

        return acc;
      },
      {
        totalCostValue: 0,
        totalMarketValue: 0,
        totalUnrealizedPnL: 0,
        totalItems: 0,
        totalQuantity: 0,
        latestUpdate: 0,
      },
    );

    const commodityBreakdown = Array.from(commodityMap.values()).sort(
      (a, b) => b.marketValue - a.marketValue,
    );
    const warehouseBreakdown = Array.from(warehouseMap.values()).sort(
      (a, b) => b.marketValue - a.marketValue,
    );

    return {
      ...valuation,
      averageUnrealizedPnLPercent:
        valuation.totalCostValue > 0
          ? (valuation.totalUnrealizedPnL / valuation.totalCostValue) * 100
          : 0,
      commodityBreakdown,
      warehouseBreakdown,
      lastValuationTimestamp:
        valuation.latestUpdate > 0
          ? new Date(valuation.latestUpdate)
          : undefined,
    };
  } catch (error) {
    console.error('Error calculating inventory valuation:', error);
    throw error;
  }
}

// Get low stock alerts
export async function getLowStockAlerts(threshold: number = 100) {
  try {
    const lowStockItems = await prisma.inventoryItem.findMany({
      where: {
        quantity: {
          lte: threshold
        }
      },
      include: {
        commodity: true,
      },
      orderBy: {
        quantity: 'asc'
      }
    });

    return lowStockItems;
  } catch (error) {
    console.error('Error fetching low stock alerts:', error);
    throw error;
  }
}

// Update market values for all inventory items of a specific commodity
export async function updateMarketValues(commodityId: string, newMarketValue: number) {
  try {
    const updatedItems = await prisma.inventoryItem.updateMany({
      where: { commodityId },
      data: {
        marketValue: newMarketValue,
        lastUpdated: new Date(),
      }
    });

    return updatedItems;
  } catch (error) {
    console.error('Error updating market values:', error);
    throw error;
  }
}