'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TradeSummary {
  id: string;
  commodity: {
    name: string;
  };
  counterparty?: {
    name: string;
  } | null;
  type: string;
  quantity: number;
  price: number;
  totalValue: number;
  status: string;
  tradeDate: Date;
}

interface RecentTradesProps {
  trades: TradeSummary[];
}

export function RecentTrades({ trades }: RecentTradesProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-primary/10 text-primary';
      case 'EXECUTED':
        return 'bg-emerald-100 text-emerald-700';
      case 'SETTLED':
        return 'bg-muted text-muted-foreground';
      case 'CANCELLED':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Trades</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {trades.slice(0, 5).map((trade) => (
            <div key={trade.id} className="flex items-center justify-between rounded-lg bg-muted/60 p-3">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-card-foreground">{trade.commodity.name}</span>
                  <Badge
                    variant="outline"
                    className={trade.type === 'BUY' ? 'border-emerald-200 bg-emerald-100/70 text-emerald-700' : 'border-red-200 bg-red-100/70 text-red-700'}
                  >
                    {trade.type}
                  </Badge>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {trade.quantity.toLocaleString()} @ ${trade.price.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {(trade.counterparty?.name ?? 'Unknown counterparty')} • {new Date(trade.tradeDate).toLocaleDateString()}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-card-foreground">
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