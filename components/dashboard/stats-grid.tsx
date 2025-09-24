"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Package,
  Truck,
  Users,
  FileText,
  DollarSign,
  Activity,
} from "lucide-react";

interface StatsGridProps {
  stats: {
    portfolioValue: number;
    portfolioChange: number;
    portfolioChangePercent: number;
    totalTrades: number;
    activeTrades: number;
    executedTrades: number;
    totalTradeValue: number;
    totalContracts: number;
    activeContracts: number;
    totalInventoryItems: number;
    inventoryValuation: {
      totalMarketValue: number;
      totalCostValue: number;
      unrealizedPnL: number;
    };
    totalShipments: number;
    inTransitShipments: number;
    totalCounterparties: number;
  };
}

export function StatsGrid({ stats }: StatsGridProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const statCards = [
    {
      title: "Portfolio Value",
      value: formatCurrency(stats.portfolioValue),
      icon: DollarSign,
      change: `${stats.portfolioChangePercent >= 0 ? "+" : ""}${stats.portfolioChangePercent.toFixed(1)}%`,
      changeType:
        stats.portfolioChangePercent >= 0
          ? ("positive" as const)
          : ("negative" as const),
    },
    {
      title: "Active Trades",
      value: stats.activeTrades.toString(),
      icon: Activity,
      subtitle: `${stats.totalTrades} total`,
      change: "+3",
      changeType: "positive" as const,
    },
    {
      title: "Inventory Value",
      value: formatCurrency(stats.inventoryValuation.totalMarketValue),
      icon: Package,
      change: `${stats.inventoryValuation.unrealizedPnL >= 0 ? "+" : ""}${formatCurrency(stats.inventoryValuation.unrealizedPnL)}`,
      changeType:
        stats.inventoryValuation.unrealizedPnL >= 0
          ? ("positive" as const)
          : ("negative" as const),
    },
    {
      title: "In Transit Shipments",
      value: stats.inTransitShipments.toString(),
      icon: Truck,
      subtitle: `${stats.totalShipments} total`,
      change: "-2",
      changeType: "negative" as const,
    },
    {
      title: "Active Contracts",
      value: stats.activeContracts.toString(),
      icon: FileText,
      subtitle: `${stats.totalContracts} total`,
      change: "+1",
      changeType: "positive" as const,
    },
    {
      title: "Counterparties",
      value: stats.totalCounterparties.toString(),
      icon: Users,
      change: "0",
      changeType: "neutral" as const,
    },
    {
      title: "Trade Volume",
      value: formatCurrency(stats.totalTradeValue),
      icon: TrendingUp,
      change: "+6.7%",
      changeType: "positive" as const,
    },
    {
      title: "Inventory Items",
      value: stats.totalInventoryItems.toString(),
      icon: Package,
      change: "+5",
      changeType: "positive" as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => (
        <Card key={index} className="transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">
              {stat.value}
            </div>
            {stat.subtitle && (
              <p className="mt-1 text-xs text-muted-foreground">
                {stat.subtitle}
              </p>
            )}
            <div className="mt-2 flex items-center">
              <span
                className={`text-xs font-medium ${
                  stat.changeType === "positive"
                    ? "text-emerald-600"
                    : stat.changeType === "negative"
                      ? "text-destructive"
                      : "text-muted-foreground"
                }`}
              >
                {stat.change}
              </span>
              <span className="ml-1 text-xs text-muted-foreground">
                from last month
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
