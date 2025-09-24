'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Plus, Users, CreditCard, TrendingUp, type LucideIcon } from 'lucide-react';
import { CounterpartyTable } from '@/components/counterparties/counterparty-table';
import { CounterpartyModal } from '@/components/modals/counterparty-modal';
import { CounterpartyCreditModal } from '@/components/modals/counterparty-credit-modal';
import { DeleteCounterpartyModal } from '@/components/modals/delete-counterparty-modal';
import { CounterpartyRiskPanel } from '@/components/counterparties/counterparty-risk-panel';
import {
  useCounterparties,
  useCounterpartyStatistics,
  useCreditRiskCounterparties,
} from '@/lib/hooks/use-counterparties';
import { RatingDistributionChart, TypeDistributionChart } from '@/components/counterparties/counterparty-distribution-charts';
import type { CounterpartyTableRow } from '@/components/counterparties/counterparty-table';
import { CounterpartyType, CreditRating } from '@prisma/client';
import { useToast } from '@/hooks/use-toast';

const pageSize = 10;

function useDebouncedValue<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export default function CounterpartiesPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | CounterpartyType>('all');
  const [ratingFilter, setRatingFilter] = useState<'all' | CreditRating>('all');
  const [page, setPage] = useState(0);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCounterparty, setEditingCounterparty] = useState<CounterpartyTableRow | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [creditCounterparty, setCreditCounterparty] = useState<CounterpartyTableRow | null>(null);
  const [isCreditOpen, setIsCreditOpen] = useState(false);
  const [deleteCounterparty, setDeleteCounterparty] = useState<CounterpartyTableRow | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(searchTerm, 300);
  const { toast } = useToast();

  const {
    data: counterparties = [],
    isLoading,
    isFetching,
    refetch,
    error,
  } = useCounterparties({
    type: typeFilter === 'all' ? undefined : typeFilter,
    rating: ratingFilter === 'all' ? undefined : ratingFilter,
    searchTerm: debouncedSearch ? debouncedSearch : undefined,
    limit: pageSize,
    offset: page * pageSize,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: 'Unable to load counterparties',
        description: 'Please refresh the page or adjust your filters.',
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  const { data: statistics, isLoading: statisticsLoading } = useCounterpartyStatistics();
  const {
    data: creditRisk = [],
    isLoading: creditRiskLoading,
  } = useCreditRiskCounterparties();

  useEffect(() => {
    setPage(0);
  }, [typeFilter, ratingFilter, debouncedSearch]);

  const hasNextPage = counterparties.length === pageSize;

  const exportCsv = () => {
    if (!counterparties.length) {
      toast({
        title: 'No data to export',
        description: 'Adjust your filters to include counterparties before exporting.',
      });
      return;
    }

    const header = [
      'Name',
      'Type',
      'Country',
      'Rating',
      'Credit Limit',
      'Credit Used',
      'Total Trades',
      'Total Volume',
      'Email',
      'Phone',
    ];

    const rows = counterparties.map(counterparty => [
      counterparty.name,
      counterparty.type,
      counterparty.country,
      counterparty.rating,
      counterparty.creditLimit,
      counterparty.creditUsed,
      counterparty.totalTrades,
      counterparty.totalVolume,
      counterparty.email,
      counterparty.phone,
    ]);

    const csvContent = [header, ...rows]
      .map(columns =>
        columns
          .map(value => {
            if (value === null || value === undefined) return '';
            const stringValue = String(value).replaceAll('"', '""');
            return `"${stringValue}"`;
          })
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'counterparties.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleViewCounterparty = (id: string) => {
    router.push(`/counterparties/${id}`);
  };

  const handleEditCounterparty = (counterparty: CounterpartyTableRow) => {
    setEditingCounterparty(counterparty);
    setIsEditOpen(true);
  };

  const handleCreditUpdate = (counterparty: CounterpartyTableRow) => {
    setCreditCounterparty(counterparty);
    setIsCreditOpen(true);
  };

  const handleDelete = (counterparty: CounterpartyTableRow) => {
    setDeleteCounterparty(counterparty);
    setIsDeleteOpen(true);
  };

  type StatisticCard = {
    label: string;
    value: string;
    icon: LucideIcon;
    helper?: string;
    emphasis?: boolean;
  };

  const statisticsCards = useMemo<StatisticCard[]>(() => {
    const formatCurrency = (value: number) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

    if (!statistics) {
      return [
        { label: 'Total partners', value: '—', icon: Users },
        { label: 'Credit limit', value: '—', icon: CreditCard },
        { label: 'Credit used', value: '—', icon: CreditCard },
        { label: 'Available credit', value: '—', icon: TrendingUp },
      ];
    }

    return [
      {
        label: 'Total partners',
        value: statistics.totalCounterparties.toString(),
        icon: Users,
        helper: 'Active relationships',
      },
      {
        label: 'Credit limit',
        value: formatCurrency(statistics.totalCreditLimit),
        icon: CreditCard,
        helper: 'Aggregate approved exposure',
      },
      {
        label: 'Credit used',
        value: formatCurrency(statistics.totalCreditUsed),
        icon: CreditCard,
        helper: `${statistics.creditUtilization.toFixed(1)}% utilized`,
        emphasis: true,
      },
      {
        label: 'Available credit',
        value: formatCurrency(statistics.availableCredit),
        icon: TrendingUp,
        helper: 'Capacity remaining',
      },
    ];
  }, [statistics]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Counterparties</h1>
          <p className="text-slate-600">Manage your trading partners, credit exposure, and relationship insights.</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={exportCsv} disabled={isLoading || isFetching}>
            Export CSV
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Counterparty
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statisticsLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <Card key={index}>
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="mt-2 h-3 w-32" />
                </CardContent>
              </Card>
            ))
          : statisticsCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <Card key={index}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">{card.label}</CardTitle>
                    <Icon className="h-4 w-4 text-slate-400" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${card.emphasis ? 'text-orange-600' : 'text-slate-900'}`}>
                      {card.value}
                    </div>
                    {card.helper && <p className="mt-1 text-xs text-slate-500">{card.helper}</p>}
                  </CardContent>
                </Card>
              );
            })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card className="h-full">
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <CardTitle>All counterparties</CardTitle>
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:space-x-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search by name, country, or contact"
                    value={searchTerm}
                    onChange={event => setSearchTerm(event.target.value)}
                    className="pl-9"
                    disabled={isLoading && !counterparties.length}
                  />
                </div>
                <Select
                  value={typeFilter}
                  onValueChange={value => setTypeFilter(value as 'all' | CounterpartyType)}
                  disabled={isLoading && !counterparties.length}
                >
                  <SelectTrigger className="w-full md:w-[160px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value={CounterpartyType.SUPPLIER}>Supplier</SelectItem>
                    <SelectItem value={CounterpartyType.CUSTOMER}>Customer</SelectItem>
                    <SelectItem value={CounterpartyType.BOTH}>Both</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={ratingFilter}
                  onValueChange={value => setRatingFilter(value as 'all' | CreditRating)}
                  disabled={isLoading && !counterparties.length}
                >
                  <SelectTrigger className="w-full md:w-[160px]">
                    <SelectValue placeholder="Rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value={CreditRating.AAA}>AAA</SelectItem>
                    <SelectItem value={CreditRating.AA}>AA</SelectItem>
                    <SelectItem value={CreditRating.A}>A</SelectItem>
                    <SelectItem value={CreditRating.BBB}>BBB</SelectItem>
                    <SelectItem value={CreditRating.BB}>BB</SelectItem>
                    <SelectItem value={CreditRating.B}>B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && !counterparties.length ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <CounterpartyTable
                data={counterparties as CounterpartyTableRow[]}
                onView={handleViewCounterparty}
                onEdit={handleEditCounterparty}
                onCredit={handleCreditUpdate}
                onDelete={handleDelete}
                pagination={{
                  page,
                  onPrevious: () => setPage(prev => Math.max(prev - 1, 0)),
                  onNext: () => setPage(prev => prev + 1),
                  hasNextPage,
                  isFetching,
                }}
              />
            )}
          </CardContent>
        </Card>
        <CounterpartyRiskPanel data={creditRisk} isLoading={creditRiskLoading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rating distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <RatingDistributionChart ratingDistribution={statistics?.ratingDistribution ?? {}} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Counterparty mix</CardTitle>
          </CardHeader>
          <CardContent>
            <TypeDistributionChart typeDistribution={statistics?.typeDistribution ?? { suppliers: 0, customers: 0, both: 0 }} />
          </CardContent>
        </Card>
      </div>

      <CounterpartyModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => {
          setIsCreateOpen(false);
          refetch();
        }}
      />

      {editingCounterparty && (
        <CounterpartyModal
          open={isEditOpen}
          onOpenChange={open => {
            setIsEditOpen(open);
            if (!open) {
              setEditingCounterparty(null);
            }
          }}
          counterparty={editingCounterparty}
          onSuccess={() => {
            setIsEditOpen(false);
            setEditingCounterparty(null);
            refetch();
          }}
        />
      )}

      {creditCounterparty && (
        <CounterpartyCreditModal
          open={isCreditOpen}
          onOpenChange={open => {
            setIsCreditOpen(open);
            if (!open) {
              setCreditCounterparty(null);
            }
          }}
          counterparty={creditCounterparty}
          onSuccess={() => {
            setIsCreditOpen(false);
            setCreditCounterparty(null);
            refetch();
          }}
        />
      )}

      {deleteCounterparty && (
        <DeleteCounterpartyModal
          open={isDeleteOpen}
          onOpenChange={open => {
            setIsDeleteOpen(open);
            if (!open) {
              setDeleteCounterparty(null);
            }
          }}
          counterpartyId={deleteCounterparty.id}
          counterpartyName={deleteCounterparty.name}
          onSuccess={() => {
            setIsDeleteOpen(false);
            setDeleteCounterparty(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

