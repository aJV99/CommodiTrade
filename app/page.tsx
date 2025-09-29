"use client";

import React from "react";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { RecentTrades } from "@/components/dashboard/recent-trades";
import { CommodityPrices } from "@/components/dashboard/commodity-prices";
import { PendingShipments } from "@/components/dashboard/pending-shipments";
import { useDashboardStatistics } from "@/lib/hooks/use-dashboard";
import { useTrades } from "@/lib/hooks/use-trades";
import { useCommodities } from "@/lib/hooks/use-commodities";
import { useShipments } from "@/lib/hooks/use-shipments";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStatistics();
  const { data: trades, isLoading: tradesLoading } = useTrades({ limit: 5 });
  const { data: commodities, isLoading: commoditiesLoading } = useCommodities({
    limit: 8,
  });
  const { data: shipments, isLoading: shipmentsLoading } = useShipments({
    status: "IN_TRANSIT",
    limit: 5,
  });

  if (statsLoading || tradesLoading || commoditiesLoading || shipmentsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s an overview of your trading operations.
        </p>
      </div>

      {stats && <StatsGrid stats={stats} />}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {trades && <RecentTrades trades={trades} />}
        {commodities && <CommodityPrices commodities={commodities} />}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {shipments && <PendingShipments shipments={shipments} />}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-card-foreground">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button className="rounded-lg bg-blue-50 p-4 text-left transition-colors hover:bg-blue-100">
              <div className="font-medium text-blue-900">New Trade</div>
              <div className="text-sm text-blue-600">Execute a new trade</div>
            </button>
            <button className="rounded-lg bg-green-50 p-4 text-left transition-colors hover:bg-green-100">
              <div className="font-medium text-green-900">Add Inventory</div>
              <div className="text-sm text-green-600">Update stock levels</div>
            </button>
            <button className="rounded-lg bg-purple-50 p-4 text-left transition-colors hover:bg-purple-100">
              <div className="font-medium text-purple-900">New Contract</div>
              <div className="text-sm text-purple-600">Create a contract</div>
            </button>
            <button className="rounded-lg bg-orange-50 p-4 text-left transition-colors hover:bg-orange-100">
              <div className="font-medium text-orange-900">Track Shipment</div>
              <div className="text-sm text-orange-600">Monitor delivery</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
