"use server";
import { prisma } from '@/lib/prisma';

export interface CreateInventoryData {
  commodityId: string;
  quantity: number;
  unit: string;
  warehouse: string;
  location: string;
  quality: string;
  costBasis: number;
  marketValue: number;
}

export interface UpdateInventoryData {
  quantity?: number;
  warehouse?: string;
  location?: string;
  quality?: string;
  costBasis?: number;
  marketValue?: number;
}

export interface InventoryMovement {
  inventoryId: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reason: string;
  reference?: string; // Trade ID, Contract ID, etc.
}

// Create inventory item
export async function createInventoryItem(data: CreateInventoryData) {
  try {
    // Validate commodity exists
    const commodity = await prisma.commodity.findUnique({
      where: { id: data.commodityId }
    });
    
    if (!commodity) {
      throw new Error('Commodity not found');
    }

    // Check if similar inventory item already exists
    const existingItem = await prisma.inventoryItem.findFirst({
      where: {
        commodityId: data.commodityId,
        warehouse: data.warehouse,
        location: data.location,
        quality: data.quality,
      }
    });

    if (existingItem) {
      // Merge with existing item
      const newQuantity = existingItem.quantity + data.quantity;
      const newCostBasis = ((existingItem.quantity * existingItem.costBasis) + 
                           (data.quantity * data.costBasis)) / newQuantity;

      const updatedItem = await prisma.inventoryItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          costBasis: newCostBasis,
          marketValue: data.marketValue,
          lastUpdated: new Date(),
        },
        include: {
          commodity: true,
        }
      });

      return updatedItem;
    } else {
      // Create new inventory item
      const inventoryItem = await prisma.inventoryItem.create({
        data: {
          ...data,
          lastUpdated: new Date(),
        },
        include: {
          commodity: true,
        }
      });

      return inventoryItem;
    }
  } catch (error) {
    console.error('Error creating inventory item:', error);
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
    const updatedItem = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...data,
        lastUpdated: new Date(),
      },
      include: {
        commodity: true,
      }
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
export async function processInventoryMovement(movement: InventoryMovement) {
  try {
    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { id: movement.inventoryId },
      include: { commodity: true }
    });

    if (!inventoryItem) {
      throw new Error('Inventory item not found');
    }

    let newQuantity: number;
    
    switch (movement.type) {
      case 'IN':
        newQuantity = inventoryItem.quantity + movement.quantity;
        break;
      case 'OUT':
        newQuantity = inventoryItem.quantity - movement.quantity;
        if (newQuantity < 0) {
          throw new Error('Insufficient inventory quantity');
        }
        break;
      case 'ADJUSTMENT':
        newQuantity = movement.quantity; // Direct adjustment to specific quantity
        break;
      default:
        throw new Error('Invalid movement type');
    }

    const updatedItem = await prisma.inventoryItem.update({
      where: { id: movement.inventoryId },
      data: {
        quantity: newQuantity,
        lastUpdated: new Date(),
      },
      include: {
        commodity: true,
      }
    });

    return updatedItem;
  } catch (error) {
    console.error('Error processing inventory movement:', error);
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

    const valuation = inventoryItems.reduce((acc, item) => {
      const costValue = item.quantity * item.costBasis;
      const marketValue = item.quantity * item.marketValue;
      const unrealizedPnL = marketValue - costValue;

      acc.totalCostValue += costValue;
      acc.totalMarketValue += marketValue;
      acc.totalUnrealizedPnL += unrealizedPnL;
      acc.totalItems += 1;
      acc.totalQuantity += item.quantity;

      return acc;
    }, {
      totalCostValue: 0,
      totalMarketValue: 0,
      totalUnrealizedPnL: 0,
      totalItems: 0,
      totalQuantity: 0,
    });

    return {
      ...valuation,
      averageUnrealizedPnLPercent: valuation.totalCostValue > 0 
        ? (valuation.totalUnrealizedPnL / valuation.totalCostValue) * 100 
        : 0,
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