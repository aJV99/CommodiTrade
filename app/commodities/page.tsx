'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { CommodityModal } from '@/components/modals/commodity-modal';
import { useCommodities } from '@/lib/hooks/use-commodities';

export default function CommoditiesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: commodities = [], isLoading, refetch } = useCommodities();

  const filtered = commodities.filter((c: any) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'AGRICULTURAL':
        return 'bg-green-100 text-green-800';
      case 'ENERGY':
        return 'bg-yellow-100 text-yellow-800';
      case 'METALS':
        return 'bg-gray-100 text-gray-800';
      case 'LIVESTOCK':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

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
          <h1 className="text-3xl font-bold text-slate-900">Commodities</h1>
          <p className="text-slate-600 mt-2">Manage available commodities and prices</p>
        </div>
        <CommodityModal onCommodityCreated={refetch} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <CardTitle>All Commodities</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search commodities..."
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
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Unit</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Current Price</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Change</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">% Change</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((commodity: any) => (
                  <tr
                    key={commodity.id}
                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                    onClick={() => (window.location.href = `/commodities/${commodity.id}`)}
                  >
                    <td className="py-3 px-4 font-medium text-slate-900">
                      <Link href={`/commodities/${commodity.id}`}>{commodity.name}</Link>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={getTypeColor(commodity.type)}>{commodity.type}</Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{commodity.unit}</td>
                    <td className="py-3 px-4 text-slate-700">${commodity.currentPrice.toFixed(2)}</td>
                    <td className="py-3 px-4 text-slate-700">{commodity.priceChange.toFixed(2)}</td>
                    <td className={`py-3 px-4 font-medium ${commodity.priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {commodity.priceChangePercent.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

