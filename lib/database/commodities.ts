"use server";
import { prisma } from '@/lib/prisma';
import { CommodityType } from '@prisma/client';

export interface CreateCommodityData {
  name: string;
  type: CommodityType;
  unit: string;
  currentPrice: number;
}

export interface UpdateCommodityData {
  name?: string;
  type?: CommodityType;
  unit?: string;
  currentPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
}

export interface PriceUpdate {
  commodityId: string;
  newPrice: number;
  timestamp?: Date;
}

// Create a new commodity
export async function createCommodity(data: CreateCommodityData) {
  try {
    // Check for duplicate name
    const existingCommodity = await prisma.commodity.findUnique({
      where: { name: data.name }
    });

    if (existingCommodity) {
      throw new Error('Commodity with this name already exists');
    }

    const commodity = await prisma.commodity.create({
      data: {
        ...data,
        priceChange: 0,
        priceChangePercent: 0,
      }
    });

    return commodity;
  } catch (error) {
    console.error('Error creating commodity:', error);
    throw error;
  }
}

// Get all commodities with filtering
export async function getCommodities(filters?: {
  type?: CommodityType;
  minPrice?: number;
  maxPrice?: number;
  priceChangeDirection?: 'positive' | 'negative' | 'neutral';
  limit?: number;
  offset?: number;
}) {
  try {
    const where: any = {};

    if (filters?.type) where.type = filters.type;
    
    if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
      where.currentPrice = {};
      if (filters.minPrice !== undefined) where.currentPrice.gte = filters.minPrice;
      if (filters.maxPrice !== undefined) where.currentPrice.lte = filters.maxPrice;
    }

    if (filters?.priceChangeDirection) {
      switch (filters.priceChangeDirection) {
        case 'positive':
          where.priceChange = { gt: 0 };
          break;
        case 'negative':
          where.priceChange = { lt: 0 };
          break;
        case 'neutral':
          where.priceChange = 0;
          break;
      }
    }

    const commodities = await prisma.commodity.findMany({
      where,
      include: {
        trades: {
          select: {
            id: true,
            quantity: true,
            totalValue: true,
            status: true,
          }
        },
        inventory: {
          select: {
            id: true,
            quantity: true,
            warehouse: true,
            location: true,
          }
        },
        contracts: {
          select: {
            id: true,
            quantity: true,
            totalValue: true,
            status: true,
          }
        },
        _count: {
          select: {
            trades: true,
            inventory: true,
            contracts: true,
            shipments: true,
          }
        }
      },
      orderBy: { name: 'asc' },
      take: filters?.limit || 100,
      skip: filters?.offset || 0,
    });

    return commodities;
  } catch (error) {
    console.error('Error fetching commodities:', error);
    throw error;
  }
}

// Get commodity by ID
export async function getCommodityById(id: string) {
  try {
    const commodity = await prisma.commodity.findUnique({
      where: { id },
      include: {
        trades: {
          include: {
            user: true,
          },
          orderBy: { tradeDate: 'desc' }
        },
        inventory: {
          orderBy: { lastUpdated: 'desc' }
        },
        contracts: {
          include: {
            counterparty: true,
          },
          orderBy: { createdAt: 'desc' }
        },
        shipments: {
          include: {
            trade: true,
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!commodity) {
      throw new Error('Commodity not found');
    }

    return commodity;
  } catch (error) {
    console.error('Error fetching commodity:', error);
    throw error;
  }
}

// Update commodity
export async function updateCommodity(id: string, data: UpdateCommodityData) {
  try {
    const existingCommodity = await prisma.commodity.findUnique({
      where: { id }
    });

    if (!existingCommodity) {
      throw new Error('Commodity not found');
    }

    // Check for duplicate name if name is being updated
    if (data.name && data.name !== existingCommodity.name) {
      const duplicateCommodity = await prisma.commodity.findUnique({
        where: { name: data.name }
      });

      if (duplicateCommodity) {
        throw new Error('Commodity with this name already exists');
      }
    }

    const updatedCommodity = await prisma.commodity.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      }
    });

    return updatedCommodity;
  } catch (error) {
    console.error('Error updating commodity:', error);
    throw error;
  }
}

// Update commodity price
export async function updateCommodityPrice(priceUpdate: PriceUpdate) {
  try {
    const commodity = await prisma.commodity.findUnique({
      where: { id: priceUpdate.commodityId }
    });

    if (!commodity) {
      throw new Error('Commodity not found');
    }

    const oldPrice = commodity.currentPrice;
    const newPrice = priceUpdate.newPrice;
    const priceChange = newPrice - oldPrice;
    const priceChangePercent = oldPrice > 0 ? (priceChange / oldPrice) * 100 : 0;

    const result = await prisma.$transaction(async (tx) => {
      // Update commodity price
      const updatedCommodity = await tx.commodity.update({
        where: { id: priceUpdate.commodityId },
        data: {
          currentPrice: newPrice,
          priceChange,
          priceChangePercent,
          updatedAt: new Date(),
        }
      });

      // Update market values in inventory
      await tx.inventoryItem.updateMany({
        where: { commodityId: priceUpdate.commodityId },
        data: {
          marketValue: newPrice,
          lastUpdated: new Date(),
        }
      });

      return updatedCommodity;
    });

    return result;
  } catch (error) {
    console.error('Error updating commodity price:', error);
    throw error;
  }
}

// Batch update commodity prices
export async function batchUpdateCommodityPrices(priceUpdates: PriceUpdate[]) {
  try {
    const results = await prisma.$transaction(async (tx) => {
      const updatePromises = priceUpdates.map(async (update) => {
        const commodity = await tx.commodity.findUnique({
          where: { id: update.commodityId }
        });

        if (!commodity) {
          throw new Error(`Commodity not found: ${update.commodityId}`);
        }

        const oldPrice = commodity.currentPrice;
        const newPrice = update.newPrice;
        const priceChange = newPrice - oldPrice;
        const priceChangePercent = oldPrice > 0 ? (priceChange / oldPrice) * 100 : 0;

        // Update commodity
        const updatedCommodity = await tx.commodity.update({
          where: { id: update.commodityId },
          data: {
            currentPrice: newPrice,
            priceChange,
            priceChangePercent,
            updatedAt: new Date(),
          }
        });

        // Update inventory market values
        await tx.inventoryItem.updateMany({
          where: { commodityId: update.commodityId },
          data: {
            marketValue: newPrice,
            lastUpdated: new Date(),
          }
        });

        return updatedCommodity;
      });

      return Promise.all(updatePromises);
    });

    return results;
  } catch (error) {
    console.error('Error batch updating commodity prices:', error);
    throw error;
  }
}

// Delete commodity
export async function deleteCommodity(id: string) {
  try {
    const commodity = await prisma.commodity.findUnique({
      where: { id },
      include: {
        trades: true,
        inventory: true,
        contracts: true,
        shipments: true,
      }
    });

    if (!commodity) {
      throw new Error('Commodity not found');
    }

    // Check if commodity has related records
    if (commodity.trades.length > 0 || 
        commodity.inventory.length > 0 || 
        commodity.contracts.length > 0 || 
        commodity.shipments.length > 0) {
      throw new Error('Cannot delete commodity with existing trades, inventory, contracts, or shipments');
    }

    const deletedCommodity = await prisma.commodity.delete({
      where: { id }
    });

    return deletedCommodity;
  } catch (error) {
    console.error('Error deleting commodity:', error);
    throw error;
  }
}

// Get commodity market summary
export async function getCommodityMarketSummary() {
  try {
    const commodities = await prisma.commodity.findMany({
      include: {
        _count: {
          select: {
            trades: true,
            inventory: true,
            contracts: true,
          }
        }
      }
    });

    const summary = commodities.reduce((acc, commodity) => {
      const typeKey = commodity.type;
      
      if (!acc[typeKey]) {
        acc[typeKey] = {
          count: 0,
          totalValue: 0,
          averagePrice: 0,
          priceGainers: 0,
          priceLosers: 0,
          totalTrades: 0,
          totalInventoryItems: 0,
          totalContracts: 0,
        };
      }

      acc[typeKey].count += 1;
      acc[typeKey].totalValue += commodity.currentPrice;
      acc[typeKey].totalTrades += commodity._count.trades;
      acc[typeKey].totalInventoryItems += commodity._count.inventory;
      acc[typeKey].totalContracts += commodity._count.contracts;

      if (commodity.priceChange > 0) {
        acc[typeKey].priceGainers += 1;
      } else if (commodity.priceChange < 0) {
        acc[typeKey].priceLosers += 1;
      }

      return acc;
    }, {} as any);

    // Calculate averages
    Object.keys(summary).forEach(type => {
      if (summary[type].count > 0) {
        summary[type].averagePrice = summary[type].totalValue / summary[type].count;
      }
    });

    return {
      totalCommodities: commodities.length,
      typeBreakdown: summary,
      topGainers: commodities
        .filter(c => c.priceChangePercent > 0)
        .sort((a, b) => b.priceChangePercent - a.priceChangePercent)
        .slice(0, 5),
      topLosers: commodities
        .filter(c => c.priceChangePercent < 0)
        .sort((a, b) => a.priceChangePercent - b.priceChangePercent)
        .slice(0, 5),
      mostTraded: commodities
        .sort((a, b) => b._count.trades - a._count.trades)
        .slice(0, 5),
    };
  } catch (error) {
    console.error('Error fetching commodity market summary:', error);
    throw error;
  }
}

// Get commodity price history (mock implementation - in real app would have price history table)
export async function getCommodityPriceHistory(id: string, days: number = 30) {
  try {
    const commodity = await prisma.commodity.findUnique({
      where: { id }
    });

    if (!commodity) {
      throw new Error('Commodity not found');
    }

    // Mock price history generation
    const history = [];
    const currentPrice = commodity.currentPrice;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      // Generate mock price with some volatility
      const volatility = 0.02; // 2% daily volatility
      const randomChange = (Math.random() - 0.5) * 2 * volatility;
      const price = currentPrice * (1 + randomChange * (days - i) / days);
      
      history.push({
        date: date.toISOString().split('T')[0],
        price: Math.round(price * 100) / 100,
        volume: Math.floor(Math.random() * 1000) + 100,
      });
    }

    return {
      commodity,
      history,
    };
  } catch (error) {
    console.error('Error fetching commodity price history:', error);
    throw error;
  }
}