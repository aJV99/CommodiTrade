'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { TradeModal } from '@/components/modals/trade-modal';
import { useTrades } from '@/lib/hooks/use-trades';
import { TradeStatus, TradeType } from '@prisma/client';

export default function TradingPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: trades = [], isLoading, refetch } = useTrades({
    status: statusFilter !== 'all' ? statusFilter as TradeStatus : undefined,
    type: typeFilter !== 'all' ? typeFilter as TradeType : undefined,
  });

  const filteredTrades = trades.filter(trade => {
    if (!searchTerm) return true;
    return (
      trade.commodity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.counterparty.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-blue-100 text-blue-800';
      case 'EXECUTED':
        return 'bg-green-100 text-green-800';
      case 'SETTLED':
        return 'bg-gray-100 text-gray-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'BUY' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';
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
          <h1 className="text-3xl font-bold text-slate-900">Trading</h1>
          <p className="text-slate-600 mt-2">Manage your commodity trades and orders</p>
        </div>
        <TradeModal onTradeCreated={refetch} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <CardTitle>All Trades</CardTitle>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search trades..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="EXECUTED">Executed</SelectItem>
                  <SelectItem value="SETTLED">Settled</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="BUY">Buy</SelectItem>
                  <SelectItem value="SELL">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Trade ID</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Commodity</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Quantity</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Price</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Total Value</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Counterparty</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Trade Date</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map((trade) => (
                  <tr key={trade.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-900">{trade.id}</td>
                    <td className="py-3 px-4 text-slate-700">{trade.commodity.name}</td>
                    <td className="py-3 px-4">
                      <Badge className={getTypeColor(trade.type)}>{trade.type}</Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{trade.quantity.toLocaleString()}</td>
                    <td className="py-3 px-4 text-slate-700">${trade.price.toFixed(2)}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      ${trade.totalValue.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{trade.counterparty}</td>
                    <td className="py-3 px-4">
                      <Badge className={getStatusColor(trade.status)}>{trade.status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {new Date(trade.tradeDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
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