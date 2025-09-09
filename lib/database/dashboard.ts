"use server";
import { prisma } from '@/lib/prisma';
import { TradeStatus, ContractStatus, ShipmentStatus } from '@prisma/client';

// Get comprehensive dashboard statistics
export async function getDashboardStatistics(userId?: string) {
  try {
    const whereClause = userId ? { userId } : {};

    const [
      // Trade statistics
      totalTrades,
      activeTrades,
      executedTrades,
      totalTradeValue,
      
      // Contract statistics
      totalContracts,
      activeContracts,
      totalContractValue,
      
      // Inventory statistics
      totalInventoryItems,
      totalInventoryValue,
      totalInventoryCost,
      
      // Shipment statistics
      totalShipments,
      inTransitShipments,
      delayedShipments,
      
      // Counterparty statistics
      totalCounterparties,
      totalCreditLimit,
      totalCreditUsed,
      
      // Recent activity
      recentTrades,
      recentShipments,
      expiringContracts,
      lowStockItems,
    ] = await Promise.all([
      // Trades
      prisma.trade.count({ where: whereClause }),
      prisma.trade.count({ where: { ...whereClause, status: TradeStatus.OPEN } }),
      prisma.trade.count({ where: { ...whereClause, status: TradeStatus.EXECUTED } }),
      prisma.trade.aggregate({
        where: whereClause,
        _sum: { totalValue: true }
      }),
      
      // Contracts
      prisma.contract.count(),
      prisma.contract.count({ where: { status: ContractStatus.ACTIVE } }),
      prisma.contract.aggregate({
        _sum: { totalValue: true }
      }),
      
      // Inventory
      prisma.inventoryItem.count(),
      prisma.inventoryItem.aggregate({
        _sum: { quantity: true }
      }),
      prisma.inventoryItem.aggregate({
        _sum: { costBasis: true }
      }),
      
      // Shipments
      prisma.shipment.count(),
      prisma.shipment.count({ where: { status: ShipmentStatus.IN_TRANSIT } }),
      prisma.shipment.count({ where: { status: ShipmentStatus.DELAYED } }),
      
      // Counterparties
      prisma.counterparty.count(),
      prisma.counterparty.aggregate({
        _sum: { creditLimit: true }
      }),
      prisma.counterparty.aggregate({
        _sum: { creditUsed: true }
      }),
      
      // Recent activity
      prisma.trade.findMany({
        where: whereClause,
        include: {
          commodity: true,
          user: true,
        },
        orderBy: { tradeDate: 'desc' },
        take: 5,
      }),
      
      prisma.shipment.findMany({
        where: {
          status: { in: [ShipmentStatus.IN_TRANSIT, ShipmentStatus.PREPARING] }
        },
        include: {
          commodity: true,
          trade: true,
        },
        orderBy: { expectedArrival: 'asc' },
        take: 5,
      }),
      
      // Contracts expiring in next 30 days
      prisma.contract.findMany({
        where: {
          status: ContractStatus.ACTIVE,
          endDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          }
        },
        include: {
          commodity: true,
          counterparty: true,
        },
        orderBy: { endDate: 'asc' },
        take: 5,
      }),
      
      // Low stock items (quantity < 100)
      prisma.inventoryItem.findMany({
        where: {
          quantity: { lt: 100 }
        },
        include: {
          commodity: true,
        },
        orderBy: { quantity: 'asc' },
        take: 5,
      }),
    ]);

    // Calculate inventory valuation
    const inventoryItems = await prisma.inventoryItem.findMany({
      include: { commodity: true }
    });

    const inventoryValuation = inventoryItems.reduce((acc, item) => {
      const marketValue = item.quantity * item.marketValue;
      const costValue = item.quantity * item.costBasis;
      
      acc.totalMarketValue += marketValue;
      acc.totalCostValue += costValue;
      acc.unrealizedPnL += (marketValue - costValue);
      
      return acc;
    }, {
      totalMarketValue: 0,
      totalCostValue: 0,
      unrealizedPnL: 0,
    });

    // Get top performing commodities
    const commodities = await prisma.commodity.findMany({
      orderBy: { priceChangePercent: 'desc' },
      take: 5,
    });

    // Calculate portfolio performance
    const portfolioValue = (totalTradeValue._sum.totalValue || 0) + inventoryValuation.totalMarketValue;
    const portfolioChange = inventoryValuation.unrealizedPnL;
    const portfolioChangePercent = inventoryValuation.totalCostValue > 0 
      ? (portfolioChange / inventoryValuation.totalCostValue) * 100 
      : 0;

    return {
      // Overview metrics
      portfolioValue,
      portfolioChange,
      portfolioChangePercent,
      
      // Trade metrics
      totalTrades,
      activeTrades,
      executedTrades,
      totalTradeValue: totalTradeValue._sum.totalValue || 0,
      
      // Contract metrics
      totalContracts,
      activeContracts,
      totalContractValue: totalContractValue._sum.totalValue || 0,
      
      // Inventory metrics
      totalInventoryItems,
      inventoryValuation,
      
      // Shipment metrics
      totalShipments,
      inTransitShipments,
      delayedShipments,
      
      // Counterparty metrics
      totalCounterparties,
      totalCreditLimit: totalCreditLimit._sum.creditLimit || 0,
      totalCreditUsed: totalCreditUsed._sum.creditUsed || 0,
      creditUtilization: (totalCreditLimit._sum.creditLimit || 0) > 0 
        ? ((totalCreditUsed._sum.creditUsed || 0) / (totalCreditLimit._sum.creditLimit || 0)) * 100 
        : 0,
      
      // Recent activity
      recentTrades,
      recentShipments,
      expiringContracts,
      lowStockItems,
      topPerformingCommodities: commodities,
      
      // Alerts and notifications
      alerts: {
        expiringContracts: expiringContracts.length,
        delayedShipments,
        lowStockItems: lowStockItems.length,
        creditRiskCounterparties: await getCreditRiskCount(),
      },
    };
  } catch (error) {
    console.error('Error fetching dashboard statistics:', error);
    throw error;
  }
}

// Get trading performance over time
export async function getTradingPerformance(userId?: string, days: number = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const whereClause = {
      tradeDate: { gte: startDate },
      ...(userId && { userId }),
    };

    const trades = await prisma.trade.findMany({
      where: whereClause,
      include: {
        commodity: true,
      },
      orderBy: { tradeDate: 'asc' },
    });

    // Group trades by date
    const dailyPerformance = trades.reduce((acc: any, trade) => {
      const date = trade.tradeDate.toISOString().split('T')[0];
      
      if (!acc[date]) {
        acc[date] = {
          date,
          trades: 0,
          volume: 0,
          value: 0,
          buyTrades: 0,
          sellTrades: 0,
          buyVolume: 0,
          sellVolume: 0,
        };
      }
      
      acc[date].trades += 1;
      acc[date].volume += trade.quantity;
      acc[date].value += trade.totalValue;
      
      if (trade.type === 'BUY') {
        acc[date].buyTrades += 1;
        acc[date].buyVolume += trade.quantity;
      } else {
        acc[date].sellTrades += 1;
        acc[date].sellVolume += trade.quantity;
      }
      
      return acc;
    }, {});

    return Object.values(dailyPerformance);
  } catch (error) {
    console.error('Error fetching trading performance:', error);
    throw error;
  }
}

// Get commodity exposure breakdown
export async function getCommodityExposure(userId?: string) {
  try {
    const whereClause = userId ? { userId } : {};

    const [trades, inventory, contracts] = await Promise.all([
      prisma.trade.findMany({
        where: {
          ...whereClause,
          status: { in: [TradeStatus.OPEN, TradeStatus.EXECUTED] }
        },
        include: { commodity: true },
      }),
      
      prisma.inventoryItem.findMany({
        include: { commodity: true },
      }),
      
      prisma.contract.findMany({
        where: { status: ContractStatus.ACTIVE },
        include: { commodity: true },
      }),
    ]);

    // Calculate exposure by commodity
    const exposureMap = new Map();

    // Add trade exposure
    trades.forEach(trade => {
      const commodityName = trade.commodity.name;
      const existing = exposureMap.get(commodityName) || {
        commodity: trade.commodity,
        tradeValue: 0,
        tradeVolume: 0,
        inventoryValue: 0,
        inventoryVolume: 0,
        contractValue: 0,
        contractVolume: 0,
        totalValue: 0,
        totalVolume: 0,
      };
      
      existing.tradeValue += trade.totalValue;
      existing.tradeVolume += trade.quantity;
      exposureMap.set(commodityName, existing);
    });

    // Add inventory exposure
    inventory.forEach(item => {
      const commodityName = item.commodity.name;
      const existing = exposureMap.get(commodityName) || {
        commodity: item.commodity,
        tradeValue: 0,
        tradeVolume: 0,
        inventoryValue: 0,
        inventoryVolume: 0,
        contractValue: 0,
        contractVolume: 0,
        totalValue: 0,
        totalVolume: 0,
      };
      
      existing.inventoryValue += item.quantity * item.marketValue;
      existing.inventoryVolume += item.quantity;
      exposureMap.set(commodityName, existing);
    });

    // Add contract exposure
    contracts.forEach(contract => {
      const commodityName = contract.commodity.name;
      const existing = exposureMap.get(commodityName) || {
        commodity: contract.commodity,
        tradeValue: 0,
        tradeVolume: 0,
        inventoryValue: 0,
        inventoryVolume: 0,
        contractValue: 0,
        contractVolume: 0,
        totalValue: 0,
        totalVolume: 0,
      };
      
      existing.contractValue += contract.totalValue;
      existing.contractVolume += contract.remaining;
      exposureMap.set(commodityName, existing);
    });

    // Calculate totals and convert to array
    const exposure = Array.from(exposureMap.values()).map(item => ({
      ...item,
      totalValue: item.tradeValue + item.inventoryValue + item.contractValue,
      totalVolume: item.tradeVolume + item.inventoryVolume + item.contractVolume,
    }));

    // Sort by total value descending
    exposure.sort((a, b) => b.totalValue - a.totalValue);

    const totalExposure = exposure.reduce((sum, item) => sum + item.totalValue, 0);

    return {
      exposure: exposure.map(item => ({
        ...item,
        percentage: totalExposure > 0 ? (item.totalValue / totalExposure) * 100 : 0,
      })),
      totalExposure,
    };
  } catch (error) {
    console.error('Error fetching commodity exposure:', error);
    throw error;
  }
}

// Helper function to get credit risk count
async function getCreditRiskCount(threshold: number = 80): Promise<number> {
  try {
    const counterparties = await prisma.counterparty.findMany({
      where: {
        creditLimit: { gt: 0 }
      }
    });

    const riskCount = counterparties.filter(cp => {
      const utilization = (cp.creditUsed / cp.creditLimit) * 100;
      return utilization >= threshold;
    }).length;

    return riskCount;
  } catch (error) {
    console.error('Error calculating credit risk count:', error);
    return 0;
  }
}

// Get system health metrics
export async function getSystemHealthMetrics() {
  try {
    const [
      totalRecords,
      recentActivity,
      dataIntegrity,
    ] = await Promise.all([
      // Count all major entities
      Promise.all([
        prisma.trade.count(),
        prisma.inventoryItem.count(),
        prisma.contract.count(),
        prisma.shipment.count(),
        prisma.counterparty.count(),
        prisma.commodity.count(),
      ]).then(counts => ({
        trades: counts[0],
        inventory: counts[1],
        contracts: counts[2],
        shipments: counts[3],
        counterparties: counts[4],
        commodities: counts[5],
        total: counts.reduce((sum, count) => sum + count, 0),
      })),
      
      // Recent activity (last 24 hours)
      Promise.all([
        prisma.trade.count({
          where: {
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          }
        }),
        prisma.inventoryItem.count({
          where: {
            lastUpdated: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          }
        }),
        prisma.shipment.count({
          where: {
            updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          }
        }),
      ]).then(counts => ({
        newTrades: counts[0],
        inventoryUpdates: counts[1],
        shipmentUpdates: counts[2],
      })),
      
      // Data integrity checks
      Promise.all([
        // Trades without commodities
        prisma.trade.count({
          where: {
            commodityId: undefined
          }
        }),
        // Inventory without commodities
        prisma.inventoryItem.count({
          where: {
            commodityId: undefined
          }
        }),
        // Contracts without counterparties
        prisma.contract.count({
          where: {
            counterpartyId: undefined,
          }
        }),
      ]).then(counts => ({
        orphanedTrades: counts[0],
        orphanedInventory: counts[1],
        orphanedContracts: counts[2],
        totalIssues: counts.reduce((sum, count) => sum + count, 0),
      })),
    ]);

    return {
      totalRecords,
      recentActivity,
      dataIntegrity,
      healthScore: dataIntegrity.totalIssues === 0 ? 100 : Math.max(0, 100 - (dataIntegrity.totalIssues * 10)),
      lastUpdated: new Date(),
    };
  } catch (error) {
    console.error('Error fetching system health metrics:', error);
    throw error;
  }
}