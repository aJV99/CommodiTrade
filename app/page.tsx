'use client';

import React from 'react';
import { StatsGrid } from '@/components/dashboard/stats-grid';
import { RecentTrades } from '@/components/dashboard/recent-trades';
import { CommodityPrices } from '@/components/dashboard/commodity-prices';
import { PendingShipments } from '@/components/dashboard/pending-shipments';
import { useDashboardStatistics } from '@/lib/hooks/use-dashboard';
import { useTrades } from '@/lib/hooks/use-trades';
import { useCommodities } from '@/lib/hooks/use-commodities';
import { useShipments } from '@/lib/hooks/use-shipments';

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStatistics();
  const { data: trades, isLoading: tradesLoading } = useTrades({ limit: 5 });
  const { data: commodities, isLoading: commoditiesLoading } = useCommodities({ limit: 8 });
  const { data: shipments, isLoading: shipmentsLoading } = useShipments({ 
    status: 'IN_TRANSIT',
    limit: 5 
  });

  if (statsLoading || tradesLoading || commoditiesLoading || shipmentsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-2">
          Welcome back! Here's an overview of your trading operations.
        </p>
      </div>

      {stats && <StatsGrid stats={stats} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {trades && <RecentTrades trades={trades} />}
        {commodities && <CommodityPrices commodities={commodities} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {shipments && <PendingShipments shipments={shipments} />}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors">
              <div className="font-medium text-blue-900">New Trade</div>
              <div className="text-sm text-blue-600">Execute a new trade</div>
            </button>
            <button className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left transition-colors">
              <div className="font-medium text-green-900">Add Inventory</div>
              <div className="text-sm text-green-600">Update stock levels</div>
            </button>
            <button className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-left transition-colors">
              <div className="font-medium text-purple-900">New Contract</div>
              <div className="text-sm text-purple-600">Create a contract</div>
            </button>
            <button className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg text-left transition-colors">
              <div className="font-medium text-orange-900">Track Shipment</div>
              <div className="text-sm text-orange-600">Monitor delivery</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}