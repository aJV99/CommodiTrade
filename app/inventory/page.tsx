'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Package, TrendingUp, TrendingDown } from 'lucide-react';
import { InventoryModal } from '@/components/modals/inventory-modal';
import { useInventory, useInventoryValuation } from '@/lib/hooks/use-inventory';

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: inventory = [], isLoading, refetch } = useInventory();
  const { data: valuation } = useInventoryValuation();

  const filteredInventory = inventory.filter(item => {
    if (!searchTerm) return true;
    return (
      item.commodity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.warehouse.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Inventory Management</h1>
          <p className="text-slate-600 mt-2">Track your commodity stocks and warehouse positions</p>
        </div>
        <InventoryModal onInventoryCreated={refetch} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Value</CardTitle>
            <Package className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${valuation?.totalMarketValue.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-slate-500 mt-1">Market value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Unrealized P&L</CardTitle>
            {(valuation?.totalUnrealizedPnL || 0) >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(valuation?.totalUnrealizedPnL || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${valuation?.totalUnrealizedPnL.toLocaleString() || '0'}
            </div>
            <p className={`text-xs mt-1 ${(valuation?.averageUnrealizedPnLPercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(valuation?.averageUnrealizedPnLPercent || 0) >= 0 ? '+' : ''}{(valuation?.averageUnrealizedPnLPercent || 0).toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Items</CardTitle>
            <Package className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory.length}</div>
            <p className="text-xs text-slate-500 mt-1">Commodity types</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Warehouses</CardTitle>
            <Package className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(inventory.map(item => item.warehouse)).size}
            </div>
            <p className="text-xs text-slate-500 mt-1">Locations</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <CardTitle>Inventory Holdings</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search inventory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Commodity</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Quantity</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Warehouse</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Location</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Quality</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Cost Basis</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Market Value</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Unrealized P&L</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Last Updated</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => {
                  const unrealizedPnL = item.quantity * (item.marketValue - item.costBasis);
                  const unrealizedPnLPercent = ((item.marketValue - item.costBasis) / item.costBasis) * 100;
                  
                  return (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-900">{item.commodity.name}</td>
                      <td className="py-3 px-4 text-slate-700">
                        {item.quantity.toLocaleString()} {item.unit}
                      </td>
                      <td className="py-3 px-4 text-slate-700">{item.warehouse}</td>
                      <td className="py-3 px-4 text-slate-700">{item.location}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{item.quality}</Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-700">${item.costBasis.toFixed(2)}</td>
                      <td className="py-3 px-4 text-slate-700">${item.marketValue.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <div className={`${unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${unrealizedPnL.toLocaleString()}
                          <div className="text-xs">
                            ({unrealizedPnL >= 0 ? '+' : ''}{unrealizedPnLPercent.toFixed(1)}%)
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {new Date(item.lastUpdated).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}