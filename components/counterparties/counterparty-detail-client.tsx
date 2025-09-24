'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CounterpartyModal } from '@/components/modals/counterparty-modal';
import { CounterpartyCreditModal } from '@/components/modals/counterparty-credit-modal';
import { DeleteCounterpartyModal } from '@/components/modals/delete-counterparty-modal';
import { ArrowLeft, Pencil, ShieldAlert, Trash2 } from 'lucide-react';
import type { getCounterpartyById, getCounterpartyPerformance } from '@/lib/database/counterparties';
import { CounterpartyType, CreditRating } from '@prisma/client';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Cell, Pie, PieChart } from 'recharts';

export type CounterpartyDetail = Awaited<ReturnType<typeof getCounterpartyById>>;
export type CounterpartyPerformance = Awaited<ReturnType<typeof getCounterpartyPerformance>>['performance'];

interface CounterpartyDetailClientProps {
  counterparty: CounterpartyDetail;
  performance: CounterpartyPerformance;
}

const typeLabels: Record<CounterpartyType, string> = {
  SUPPLIER: 'Supplier',
  CUSTOMER: 'Customer',
  BOTH: 'Supplier & Customer',
};

const typeBadgeColors: Record<CounterpartyType, string> = {
  SUPPLIER: 'bg-blue-100 text-blue-700',
  CUSTOMER: 'bg-green-100 text-green-700',
  BOTH: 'bg-purple-100 text-purple-700',
};

const ratingColors: Record<CreditRating, string> = {
  AAA: 'bg-emerald-100 text-emerald-700',
  AA: 'bg-emerald-100 text-emerald-700',
  A: 'bg-sky-100 text-sky-700',
  BBB: 'bg-amber-100 text-amber-700',
  BB: 'bg-orange-100 text-orange-700',
  B: 'bg-red-100 text-red-700',
};

const palette = ['#2563eb', '#059669', '#f97316', '#7c3aed', '#0ea5e9', '#f59e0b'];

export function CounterpartyDetailClient({ counterparty, performance }: CounterpartyDetailClientProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreditOpen, setIsCreditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const availableCredit = Math.max(0, counterparty.creditLimit - counterparty.creditUsed);
  const creditUtilization = counterparty.creditLimit > 0
    ? Math.min(100, (counterparty.creditUsed / counterparty.creditLimit) * 100)
    : 0;

  const commodityData = useMemo(() => {
    type CommodityStats = { contracts: number; totalValue: number; totalQuantity: number };
    const entries = Object.entries(performance.commodityBreakdown || {}) as [string, CommodityStats][];
    return entries.map(([commodity, stats], index) => ({
      commodity,
      contracts: stats.contracts,
      totalValue: stats.totalValue,
      totalQuantity: stats.totalQuantity,
      fill: palette[index % palette.length],
    }));
  }, [performance.commodityBreakdown]);

  const recentContracts = counterparty.contracts.slice(0, 6);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => router.push('/counterparties')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <h1 className="text-3xl font-bold text-slate-900">{counterparty.name}</h1>
            <Badge className={`${ratingColors[counterparty.rating]} font-semibold`}>
              {counterparty.rating}
            </Badge>
            <Badge className={`${typeBadgeColors[counterparty.type]} font-medium`}>
              {typeLabels[counterparty.type]}
            </Badge>
          </div>
          <div className="space-y-1 text-sm text-slate-600">
            <p>Based in <span className="font-medium text-slate-900">{counterparty.country}</span></p>
            <p>Primary contact: <span className="font-medium text-slate-900">{counterparty.contactPerson}</span></p>
            <p>Last trade: {counterparty.lastTradeDate ? new Date(counterparty.lastTradeDate).toLocaleDateString() : '—'}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setIsCreditOpen(true)}>
            <ShieldAlert className="mr-2 h-4 w-4" /> Update credit
          </Button>
          <Button onClick={() => setIsEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit details
          </Button>
          <Button variant="destructive" onClick={() => setIsDeleteOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Credit utilization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <div className="text-2xl font-bold text-slate-900">{creditUtilization.toFixed(1)}%</div>
            <p>
              {formatCurrency(counterparty.creditUsed)} of {formatCurrency(counterparty.creditLimit)} used. Available credit
              is <span className="font-medium text-slate-900">{formatCurrency(availableCredit)}</span>.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Trading volume</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <div className="text-2xl font-bold text-slate-900">{counterparty.totalTrades}</div>
            <p>Total contracts traded with volume of {counterparty.totalVolume.toLocaleString()} units.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Performance summary</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm text-slate-600">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Active contracts</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{performance.activeContracts}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Completion rate</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{performance.completionRate.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Executed volume</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{performance.totalExecuted.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Average contract value</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{formatCurrency(performance.averageContractValue)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Contract performance</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">Totals</p>
              <p className="text-sm text-slate-600">{performance.totalContracts} contracts worth {formatCurrency(performance.totalValue)}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Active</p>
                  <p className="mt-1 font-semibold text-slate-900">{performance.activeContracts}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Completed</p>
                  <p className="mt-1 font-semibold text-slate-900">{performance.completedContracts}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Cancelled</p>
                  <p className="mt-1 font-semibold text-slate-900">{performance.cancelledContracts}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Execution rate</p>
                  <p className="mt-1 font-semibold text-slate-900">{performance.executionRate.toFixed(1)}%</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">Commodity mix</p>
              {commodityData.length ? (
                <ChartContainer
                  config={commodityData.reduce((acc, item) => {
                    acc[item.commodity] = { label: item.commodity, color: item.fill };
                    return acc;
                  }, {} as Record<string, { label: string; color: string }>)}
                  className="mt-4 h-[220px]"
                >
                  <PieChart>
                    <Pie data={commodityData} dataKey="totalValue" nameKey="commodity" innerRadius={50} strokeWidth={5}>
                      {commodityData.map(item => (
                        <Cell key={item.commodity} fill={item.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              ) : (
                <p className="mt-4 text-sm text-slate-500">No commodity allocation data yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Contact information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Email</p>
              <p className="mt-1 font-medium text-slate-900">{counterparty.email}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Phone</p>
              <p className="mt-1 font-medium text-slate-900">{counterparty.phone}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Contracts</p>
              <p className="mt-1 font-medium text-slate-900">{counterparty._count?.contracts ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent contracts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contract</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Commodity</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Total value</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentContracts.map(contract => (
                  <TableRow key={contract.id}>
                    <TableCell className="font-medium text-slate-900">{contract.id}</TableCell>
                    <TableCell>{contract.status}</TableCell>
                    <TableCell>{contract.commodity?.name ?? '—'}</TableCell>
                    <TableCell>{contract.quantity.toLocaleString()}</TableCell>
                    <TableCell>{formatCurrency(contract.totalValue)}</TableCell>
                    <TableCell>{new Date(contract.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
                {recentContracts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-slate-500">
                      No contracts recorded for this counterparty yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CounterpartyModal
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        counterparty={counterparty}
        onSuccess={() => {
          setIsEditOpen(false);
          router.refresh();
        }}
      />
      <CounterpartyCreditModal
        open={isCreditOpen}
        onOpenChange={setIsCreditOpen}
        counterparty={{
          id: counterparty.id,
          name: counterparty.name,
          rating: counterparty.rating,
          creditLimit: counterparty.creditLimit,
          creditUsed: counterparty.creditUsed,
        }}
        onSuccess={() => {
          setIsCreditOpen(false);
          router.refresh();
        }}
      />
      <DeleteCounterpartyModal
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        counterpartyId={counterparty.id}
        counterpartyName={counterparty.name}
        onSuccess={() => {
          setIsDeleteOpen(false);
          router.push('/counterparties');
        }}
      />
    </div>
  );
}

