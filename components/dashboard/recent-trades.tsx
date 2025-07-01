'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Trade {
  id: string;
  commodity: {
    name: string;
  };
  type: string;
  quantity: number;
  price: number;
  totalValue: number;
  counterparty: string;
  status: string;
  tradeDate: Date;
}

interface RecentTradesProps {
  trades: Trade[];
}

export function RecentTrades({ trades }: RecentTradesProps) {
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
    return type === 'BUY' ? 'text-green-600' : 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Trades</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {trades.slice(0, 5).map((trade) => (
            <div key={trade.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-slate-900">{trade.commodity.name}</span>
                  <Badge variant="outline" className={getTypeColor(trade.type)}>
                    {trade.type}
                  </Badge>
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  {trade.quantity.toLocaleString()} @ ${trade.price.toFixed(2)}
                </div>
                <div className="text-xs text-slate-500">
                  {trade.counterparty} • {new Date(trade.tradeDate).toLocaleDateString()}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-slate-900">
                  ${trade.totalValue.toLocaleString()}
                </div>
                <Badge className={getStatusColor(trade.status)}>
                  {trade.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}