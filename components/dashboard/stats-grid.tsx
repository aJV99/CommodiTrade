'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Package, Truck, Users, FileText, DollarSign, Activity } from 'lucide-react';

interface StatsGridProps {
  stats: {
    portfolioValue: number;
    portfolioChange: number;
    portfolioChangePercent: number;
    totalTrades: number;
    activeTrades: number;
    totalTradeValue: number;
    totalContracts: number;
    activeContracts: number;
    totalInventoryItems: number;
    inventoryValuation: {
      totalMarketValue: number;
      totalUnrealizedPnL: number;
    };
    totalShipments: number;
    inTransitShipments: number;
    totalCounterparties: number;
  };
}

export function StatsGrid({ stats }: StatsGridProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const statCards = [
    {
      title: 'Portfolio Value',
      value: formatCurrency(stats.portfolioValue),
      icon: DollarSign,
      change: `${stats.portfolioChangePercent >= 0 ? '+' : ''}${stats.portfolioChangePercent.toFixed(1)}%`,
      changeType: stats.portfolioChangePercent >= 0 ? 'positive' as const : 'negative' as const,
    },
    {
      title: 'Active Trades',
      value: stats.activeTrades.toString(),
      icon: Activity,
      subtitle: `${stats.totalTrades} total`,
      change: '+3',
      changeType: 'positive' as const,
    },
    {
      title: 'Inventory Value',
      value: formatCurrency(stats.inventoryValuation.totalMarketValue),
      icon: Package,
      change: `${stats.inventoryValuation.totalUnrealizedPnL >= 0 ? '+' : ''}${formatCurrency(stats.inventoryValuation.totalUnrealizedPnL)}`,
      changeType: stats.inventoryValuation.totalUnrealizedPnL >= 0 ? 'positive' as const : 'negative' as const,
    },
    {
      title: 'In Transit Shipments',
      value: stats.inTransitShipments.toString(),
      icon: Truck,
      subtitle: `${stats.totalShipments} total`,
      change: '-2',
      changeType: 'negative' as const,
    },
    {
      title: 'Active Contracts',
      value: stats.activeContracts.toString(),
      icon: FileText,
      subtitle: `${stats.totalContracts} total`,
      change: '+1',
      changeType: 'positive' as const,
    },
    {
      title: 'Counterparties',
      value: stats.totalCounterparties.toString(),
      icon: Users,
      change: '0',
      changeType: 'neutral' as const,
    },
    {
      title: 'Trade Volume',
      value: formatCurrency(stats.totalTradeValue),
      icon: TrendingUp,
      change: '+6.7%',
      changeType: 'positive' as const,
    },
    {
      title: 'Inventory Items',
      value: stats.totalInventoryItems.toString(),
      icon: Package,
      change: '+5',
      changeType: 'positive' as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
            {stat.subtitle && (
              <p className="text-xs text-slate-500 mt-1">{stat.subtitle}</p>
            )}
            <div className="flex items-center mt-2">
              <span
                className={`text-xs font-medium ${
                  stat.changeType === 'positive'
                    ? 'text-green-600'
                    : stat.changeType === 'negative'
                    ? 'text-red-600'
                    : 'text-slate-500'
                }`}
              >
                {stat.change}
              </span>
              <span className="text-xs text-slate-500 ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}