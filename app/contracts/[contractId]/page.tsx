'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { Prisma } from '@prisma/client';
import { differenceInCalendarDays, format, formatDistanceToNow } from 'date-fns';
import { AlertCircle, ArrowLeft, ClipboardEdit, DollarSign, Factory, Gauge, Shield, TrendingUp } from 'lucide-react';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useToast } from '@/hooks/use-toast';
import {
  useCancelContract,
  useContract,
  useExecuteContract,
  useUpdateContract,
} from '@/lib/hooks/use-contracts';
import { useInventory } from '@/lib/hooks/use-inventory';

type ContractWithRelations = Prisma.ContractGetPayload<{
  include: { commodity: true; counterparty: true };
}>;

type InventoryItemWithCommodity = Prisma.InventoryItemGetPayload<{
  include: { commodity: true };
}>;

const statusLabels: Record<ContractWithRelations['status'], string> = {
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const typeLabels: Record<ContractWithRelations['type'], string> = {
  PURCHASE: 'Purchase',
  SALE: 'Sale',
};

const statusStyles: Record<ContractWithRelations['status'], string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  COMPLETED: 'bg-blue-100 text-blue-800 border-blue-200',
  CANCELLED: 'bg-rose-100 text-rose-800 border-rose-200',
};

const typeStyles: Record<ContractWithRelations['type'], string> = {
  PURCHASE: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  SALE: 'bg-amber-50 text-amber-600 border-amber-200',
};

const formatCurrency = (value: number, options?: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options,
  }).format(value);

const formatDateDisplay = (value: string | Date) => {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return format(parsed, 'PPP');
};

const formatDateInput = (date: Date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().split('T')[0];
};

const toInputString = (value: string | Date) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : formatDateInput(parsed);
};

export default function ContractDetailPage() {
  const params = useParams<{ contractId?: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const contractIdParam = params?.contractId;
  const contractId = Array.isArray(contractIdParam) ? contractIdParam[0] : contractIdParam;

  const {
    data: contract,
    isLoading,
    isError,
    error,
  } = useContract(contractId);

  const commodityFilter = contract ? { commodityId: contract.commodityId } : undefined;
  const { data: inventoryItems = [] } = useInventory(commodityFilter, {
    enabled: Boolean(contract?.commodityId),
  });

  const updateContractMutation = useUpdateContract();
  const executeContractMutation = useExecuteContract();
  const cancelContractMutation = useCancelContract();

  const [updateError, setUpdateError] = useState<string | null>(null);
  const [executeError, setExecuteError] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    quantity: '',
    price: '',
    startDate: '',
    endDate: '',
    deliveryTerms: '',
    paymentTerms: '',
  });

  const [executionForm, setExecutionForm] = useState({
    quantity: '',
    executionDate: formatDateInput(new Date()),
    tradeId: '',
    notes: '',
  });

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    if (contract) {
      setEditForm({
        quantity: contract.quantity.toString(),
        price: contract.price.toString(),
        startDate: toInputString(contract.startDate),
        endDate: toInputString(contract.endDate),
        deliveryTerms: contract.deliveryTerms,
        paymentTerms: contract.paymentTerms,
      });

      setExecutionForm((prev) => ({
        ...prev,
        executionDate: formatDateInput(new Date()),
        quantity: '',
        tradeId: '',
        notes: '',
      }));
    }
  }, [contract]);

  const availableInventory = useMemo(() => {
    return (inventoryItems as InventoryItemWithCommodity[]).reduce(
      (sum, item) => sum + item.quantity,
      0
    );
  }, [inventoryItems]);

  const progressPercent = contract?.quantity
    ? Math.min(100, Math.max(0, (contract.executed / contract.quantity) * 100))
    : 0;

  const remainingValue = contract ? contract.remaining * contract.price : 0;
  const executedValue = contract ? contract.executed * contract.price : 0;
  const creditLimit = contract ? contract.counterparty.creditLimit : 0;
  const exposureValue = contract
    ? creditLimit > 0
      ? `${formatCurrency(contract.totalValue)} (${((contract.totalValue / creditLimit) * 100).toFixed(1)}% of limit)`
      : `${formatCurrency(contract.totalValue)} (no credit limit set)`
    : '';

  const daysToStart = contract
    ? differenceInCalendarDays(new Date(contract.startDate), new Date())
    : 0;

  const daysToEnd = contract
    ? differenceInCalendarDays(new Date(contract.endDate), new Date())
    : 0;

  const handleUpdateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!contract || updateContractMutation.isPending) {
      return;
    }

    setUpdateError(null);

    const updates: Record<string, unknown> = {};
    let hasChanges = false;

    const parsedQuantity = Number(editForm.quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setUpdateError('Quantity must be a positive number.');
      return;
    }
    if (parsedQuantity !== contract.quantity) {
      updates.quantity = Math.round(parsedQuantity);
      hasChanges = true;
    }

    const parsedPrice = Number(editForm.price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setUpdateError('Price must be a positive number.');
      return;
    }
    if (parsedPrice !== contract.price) {
      updates.price = parsedPrice;
      hasChanges = true;
    }

    if (!editForm.startDate) {
      setUpdateError('Start date is required.');
      return;
    }
    if (!editForm.endDate) {
      setUpdateError('End date is required.');
      return;
    }

    const startDate = new Date(editForm.startDate);
    const endDate = new Date(editForm.endDate);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setUpdateError('Please provide valid dates.');
      return;
    }

    if (endDate <= startDate) {
      setUpdateError('End date must be after the start date.');
      return;
    }

    const originalStart = toInputString(contract.startDate);
    if (editForm.startDate !== originalStart) {
      updates.startDate = startDate;
      hasChanges = true;
    }

    const originalEnd = toInputString(contract.endDate);
    if (editForm.endDate !== originalEnd) {
      updates.endDate = endDate;
      hasChanges = true;
    }

    const deliveryTerms = editForm.deliveryTerms.trim();
    if (!deliveryTerms) {
      setUpdateError('Delivery terms cannot be empty.');
      return;
    }
    if (deliveryTerms !== contract.deliveryTerms) {
      updates.deliveryTerms = deliveryTerms;
      hasChanges = true;
    }

    const paymentTerms = editForm.paymentTerms.trim();
    if (!paymentTerms) {
      setUpdateError('Payment terms cannot be empty.');
      return;
    }
    if (paymentTerms !== contract.paymentTerms) {
      updates.paymentTerms = paymentTerms;
      hasChanges = true;
    }

    if (!hasChanges) {
      setUpdateError('No changes detected.');
      return;
    }

    try {
      await updateContractMutation.mutateAsync({
        id: contract.id,
        data: updates,
      });

      toast({
        title: 'Contract updated',
        description: 'The commercial terms were saved successfully.',
      });
    } catch (mutationError) {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : 'Failed to update contract. Please try again.';
      setUpdateError(message);
    }
  };

  const handleExecuteSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!contract || executeContractMutation.isPending) {
      return;
    }

    setExecuteError(null);

    const parsedQuantity = Number(executionForm.quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setExecuteError('Execution quantity must be a positive number.');
      return;
    }

    if (parsedQuantity > contract.remaining) {
      setExecuteError('Quantity exceeds the remaining balance.');
      return;
    }

    if (!executionForm.executionDate) {
      setExecuteError('Execution date is required.');
      return;
    }

    const executionDate = new Date(executionForm.executionDate);
    if (Number.isNaN(executionDate.getTime())) {
      setExecuteError('Please provide a valid execution date.');
      return;
    }

    try {
      await executeContractMutation.mutateAsync({
        contractId: contract.id,
        quantity: Math.round(parsedQuantity),
        executionDate,
        tradeId: executionForm.tradeId.trim() || undefined,
        notes: executionForm.notes.trim() || undefined,
      });

      toast({
        title: 'Contract tranche executed',
        description: `Booked ${Math.round(parsedQuantity).toLocaleString()} units against this contract.`,
      });

      setExecutionForm({
        quantity: '',
        executionDate: formatDateInput(new Date()),
        tradeId: '',
        notes: '',
      });
    } catch (mutationError) {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : 'Failed to execute contract. Please try again.';
      setExecuteError(message);
    }
  };

  const handleCancelContract = async () => {
    if (!contract || cancelContractMutation.isPending) {
      return;
    }

    setCancelError(null);

    try {
      await cancelContractMutation.mutateAsync({
        id: contract.id,
        reason: cancelReason.trim() || undefined,
      });

      toast({
        title: 'Contract cancelled',
        description: 'The remaining balance will no longer be available for execution.',
      });

      setCancelDialogOpen(false);
      setCancelReason('');
    } catch (mutationError) {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : 'Unable to cancel contract. Please try again.';
      setCancelError(message);
    }
  };

  if (!contractId) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-2 text-center">
        <AlertCircle className="h-8 w-8 text-amber-500" />
        <p className="text-lg font-semibold text-slate-900">No contract selected</p>
        <p className="text-sm text-slate-600">Provide a contract identifier to view its details.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/contracts">Back to contracts</Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  if (isError) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';

    return (
      <div className="flex h-full flex-col items-center justify-center space-y-3 text-center">
        <AlertCircle className="h-10 w-10 text-rose-500" />
        <div>
          <p className="text-lg font-semibold text-slate-900">Unable to load contract</p>
          <p className="text-sm text-slate-600">{message}</p>
        </div>
        <Button variant="outline" onClick={() => router.refresh()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-2 text-center">
        <AlertCircle className="h-8 w-8 text-amber-500" />
        <p className="text-lg font-semibold text-slate-900">Contract not found</p>
        <p className="text-sm text-slate-600">The contract may have been removed or you may not have access.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/contracts">Back to contracts</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/contracts">Contracts</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{contract.commodity.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="px-2" asChild>
            <Link href="/contracts">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={`${typeStyles[contract.type]} border`}>{typeLabels[contract.type]}</Badge>
              <Badge className={`${statusStyles[contract.status]} border`}>{statusLabels[contract.status]}</Badge>
            </div>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">
              {contract.commodity.name} · {contract.counterparty.name}
            </h1>
            <p className="mt-1 text-sm text-slate-600">Contract ID: {contract.id}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-slate-500">Total Contract Value</p>
          <p className="text-3xl font-semibold text-slate-900">{formatCurrency(contract.totalValue)}</p>
          <p className="text-xs text-slate-500">Last updated {formatDistanceToNow(new Date(contract.updatedAt), { addSuffix: true })}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
            <Gauge className="h-4 w-4 text-blue-600" /> Execution progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Progress value={progressPercent} />
            <div className="mt-2 flex flex-wrap items-center justify-between text-sm text-slate-600">
              <span>
                {contract.executed.toLocaleString()} executed · {contract.remaining.toLocaleString()} remaining
              </span>
              <span>{progressPercent.toFixed(0)}% complete</span>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryStat
              label="Committed quantity"
              value={`${contract.quantity.toLocaleString()} ${contract.commodity.unit}`}
              icon={<ClipboardEdit className="h-4 w-4 text-indigo-500" />}
            />
            <SummaryStat
              label="Executed value"
              value={formatCurrency(executedValue)}
              icon={<DollarSign className="h-4 w-4 text-emerald-500" />}
            />
            <SummaryStat
              label="Outstanding value"
              value={formatCurrency(remainingValue)}
              icon={<TrendingUp className="h-4 w-4 text-amber-500" />}
            />
            <SummaryStat
              label="Days to expiry"
              value={daysToEnd >= 0 ? `${daysToEnd} days` : 'Past due'}
              icon={<AlertCircle className="h-4 w-4 text-rose-500" />}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg font-semibold text-slate-800">Commercial terms</CardTitle>
              <p className="text-sm text-slate-500">
                Keep contract commitments aligned with the negotiated schedule and economics.
              </p>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleUpdateSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Quantity" description="Total committed units">
                    <Input
                      value={editForm.quantity}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, quantity: event.target.value }))
                      }
                      inputMode="numeric"
                      required
                    />
                  </Field>
                  <Field label="Unit price" description="Contract currency per unit">
                    <Input
                      value={editForm.price}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, price: event.target.value }))
                      }
                      inputMode="decimal"
                      required
                    />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Start date">
                    <Input
                      type="date"
                      value={editForm.startDate}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, startDate: event.target.value }))
                      }
                      required
                    />
                  </Field>
                  <Field label="End date">
                    <Input
                      type="date"
                      value={editForm.endDate}
                      min={editForm.startDate}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, endDate: event.target.value }))
                      }
                      required
                    />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Delivery terms">
                    <Textarea
                      value={editForm.deliveryTerms}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, deliveryTerms: event.target.value }))
                      }
                      rows={3}
                      required
                    />
                  </Field>
                  <Field label="Payment terms">
                    <Textarea
                      value={editForm.paymentTerms}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, paymentTerms: event.target.value }))
                      }
                      rows={3}
                      required
                    />
                  </Field>
                </div>
                {updateError ? (
                  <p className="text-sm text-rose-600">{updateError}</p>
                ) : null}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    Created {formatDateDisplay(contract.createdAt)} · Last updated {formatDateDisplay(contract.updatedAt)}
                  </p>
                  <Button type="submit" disabled={updateContractMutation.isPending || contract.status === 'CANCELLED'}>
                    {updateContractMutation.isPending ? 'Saving…' : 'Save changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg font-semibold text-slate-800">Lifecycle analytics</CardTitle>
              <p className="text-sm text-slate-500">
                Understand how this agreement is progressing relative to plan and the rest of your book.
              </p>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <AnalyticsItem
                label="Execution rate"
                value={`${progressPercent.toFixed(1)}%`}
                caption="Executed vs total commitment"
              />
              <AnalyticsItem
                label="Remaining quantity"
                value={`${contract.remaining.toLocaleString()} ${contract.commodity.unit}`}
                caption="Available for future drawdowns"
              />
              <AnalyticsItem
                label="Contract window"
                value={`${formatDateDisplay(contract.startDate)} → ${formatDateDisplay(contract.endDate)}`}
                caption={daysToStart > 0 ? `${daysToStart} days until start` : 'In effect'}
              />
              <AnalyticsItem
                label="Counterparty exposure"
                value={exposureValue}
                caption={`Credit used: ${formatCurrency(contract.counterparty.creditUsed)}`}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-800">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <section>
                <h3 className="text-sm font-semibold text-slate-700">Execute tranche</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Book a delivery or lifting against this contract. Inventory and linked trades will update automatically.
                </p>
                <form className="mt-3 space-y-3" onSubmit={handleExecuteSubmit}>
                  <div className="grid gap-3">
                    <Input
                      placeholder="Quantity"
                      value={executionForm.quantity}
                      onChange={(event) =>
                        setExecutionForm((prev) => ({ ...prev, quantity: event.target.value }))
                      }
                      inputMode="numeric"
                      required
                    />
                    <Input
                      type="date"
                      value={executionForm.executionDate}
                      onChange={(event) =>
                        setExecutionForm((prev) => ({ ...prev, executionDate: event.target.value }))
                      }
                      required
                    />
                    <Input
                      placeholder="Related trade ID (optional)"
                      value={executionForm.tradeId}
                      onChange={(event) =>
                        setExecutionForm((prev) => ({ ...prev, tradeId: event.target.value }))
                      }
                    />
                    <Textarea
                      placeholder="Notes for operations (optional)"
                      value={executionForm.notes}
                      onChange={(event) =>
                        setExecutionForm((prev) => ({ ...prev, notes: event.target.value }))
                      }
                      rows={3}
                    />
                  </div>
                  {executeError ? (
                    <p className="text-sm text-rose-600">{executeError}</p>
                  ) : null}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={executeContractMutation.isPending || contract.status !== 'ACTIVE'}
                  >
                    {executeContractMutation.isPending ? 'Executing…' : 'Execute tranche'}
                  </Button>
                </form>
              </section>

              <Separator />

              <section className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">Cancel remaining volume</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Cancelling will freeze the contract and release any remaining commitment back to capacity planning.
                  </p>
                </div>
                <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      className="w-full"
                      disabled={contract.status !== 'ACTIVE' || cancelContractMutation.isPending}
                    >
                      Cancel contract
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel this contract?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will mark the agreement as cancelled and prevent further execution. Provide context for audit
                        trails if needed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Reason for cancellation (optional)"
                        value={cancelReason}
                        onChange={(event) => setCancelReason(event.target.value)}
                        rows={4}
                      />
                      {cancelError ? <p className="text-sm text-rose-600">{cancelError}</p> : null}
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={cancelContractMutation.isPending}>Back</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          void handleCancelContract();
                        }}
                        className="bg-rose-600 text-white hover:bg-rose-700"
                        disabled={cancelContractMutation.isPending}
                      >
                        {cancelContractMutation.isPending ? 'Cancelling…' : 'Confirm cancel'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </section>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
                <Shield className="h-4 w-4 text-slate-600" /> Counterparty overview
              </CardTitle>
              <p className="text-xs text-slate-500">Exposure context to gauge remaining credit and relationship health.</p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className="flex justify-between">
                <span className="font-medium text-slate-700">Name</span>
                <span>{contract.counterparty.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-700">Type</span>
                <span>{contract.counterparty.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-700">Country</span>
                <span>{contract.counterparty.country}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-700">Credit usage</span>
                <span>
                  {formatCurrency(contract.counterparty.creditUsed)} / {formatCurrency(contract.counterparty.creditLimit)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-700">Rating</span>
                <span>{contract.counterparty.rating}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-700">Last trade</span>
                <span>
                  {contract.counterparty.lastTradeDate
                    ? formatDateDisplay(contract.counterparty.lastTradeDate)
                    : '—'}
                </span>
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                <Link href="/counterparties">Open counterparty workspace</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
                <Factory className="h-4 w-4 text-slate-600" /> Commodity insights
              </CardTitle>
              <p className="text-xs text-slate-500">Market context and quality requirements for this agreement.</p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className="flex justify-between">
                <span className="font-medium text-slate-700">Commodity</span>
                <span>{contract.commodity.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-700">Category</span>
                <span>{contract.commodity.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-700">Unit of measure</span>
                <span>{contract.commodity.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-700">Live price</span>
                <span>
                  {formatCurrency(contract.commodity.currentPrice, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-700">Price change</span>
                <span>
                  {contract.commodity.priceChange >= 0 ? '+' : ''}
                  {contract.commodity.priceChange.toFixed(2)} ({contract.commodity.priceChangePercent.toFixed(2)}%)
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-base font-semibold text-slate-800">Operational impact</CardTitle>
              <p className="text-xs text-slate-500">Understand inventory availability before booking more volume.</p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className="flex justify-between">
                <span className="font-medium text-slate-700">On-hand inventory</span>
                <span>
                  {availableInventory.toLocaleString()} {contract.commodity.unit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-700">Remaining contract balance</span>
                <span>
                  {contract.remaining.toLocaleString()} {contract.commodity.unit}
                </span>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                {contract.type === 'SALE'
                  ? 'Ensure inventory covers future drawdowns before executing additional sales.'
                  : 'Executing purchase tranches will increase on-hand inventory at the contract delivery location.'}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function Field({ label, description, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-600">
      <span className="font-medium text-slate-700">{label}</span>
      {description ? <span className="text-xs text-slate-500">{description}</span> : null}
      {children}
    </label>
  );
}

interface SummaryStatProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

function SummaryStat({ label, value, icon }: SummaryStatProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

interface AnalyticsItemProps {
  label: string;
  value: string;
  caption: string;
}

function AnalyticsItem({ label, value, caption }: AnalyticsItemProps) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-sm font-semibold text-slate-800">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{caption}</p>
    </div>
  );
}
