'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle } from 'lucide-react';
import type { CreditRating, CounterpartyType } from '@prisma/client';
import type { getCreditRiskCounterparties } from '@/lib/database/counterparties';

export type CreditRiskCounterparty = Awaited<ReturnType<typeof getCreditRiskCounterparties>>[number];

interface CounterpartyRiskPanelProps {
  data: CreditRiskCounterparty[];
  isLoading?: boolean;
}

const ratingColors: Record<CreditRating, string> = {
  AAA: 'bg-emerald-100 text-emerald-700',
  AA: 'bg-emerald-100 text-emerald-700',
  A: 'bg-sky-100 text-sky-700',
  BBB: 'bg-amber-100 text-amber-700',
  BB: 'bg-orange-100 text-orange-700',
  B: 'bg-red-100 text-red-700',
};

const typeLabels: Record<CounterpartyType, string> = {
  SUPPLIER: 'Supplier',
  CUSTOMER: 'Customer',
  BOTH: 'Supplier & Customer',
};

export function CounterpartyRiskPanel({ data, isLoading }: CounterpartyRiskPanelProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold text-slate-900">Credit risk watchlist</CardTitle>
        <AlertTriangle className="h-4 w-4 text-amber-500" />
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="space-y-2">
                <div className="h-3 w-48 animate-pulse rounded bg-slate-200" />
                <div className="h-2 w-full animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        )}
        {!isLoading && data.length === 0 && (
          <p className="text-sm text-slate-500">All counterparties are within healthy utilization thresholds.</p>
        )}
        {!isLoading &&
          data.map(counterparty => (
            <div key={counterparty.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{counterparty.name}</p>
                  <p className="text-xs text-slate-500">{typeLabels[counterparty.type]}</p>
                </div>
                <Badge className={`${ratingColors[counterparty.rating]} font-semibold`}>
                  {counterparty.rating}
                </Badge>
              </div>
              <div className="mt-3 space-y-1 text-xs text-slate-500">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Used</span>
                  <span className="font-medium text-slate-900">
                    ${counterparty.creditUsed.toLocaleString()} / ${counterparty.creditLimit.toLocaleString()}
                  </span>
                </div>
                <Progress value={Math.min(100, counterparty.creditUtilization)} />
                <div className="flex items-center justify-between">
                  <span>{counterparty.creditUtilization.toFixed(1)}% utilized</span>
                  <span>Available ${Math.max(0, counterparty.availableCredit).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}

