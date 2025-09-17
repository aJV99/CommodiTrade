'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Prisma } from '@prisma/client';
import { Search, FileText, DollarSign } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ContractModal } from '@/components/modals/contract-modal';

type ContractWithRelations = Prisma.ContractGetPayload<{
  include: { commodity: true; counterparty: true };
}>;

type StatusFilter = ContractWithRelations['status'] | 'all';
type TypeFilter = ContractWithRelations['type'] | 'all';

type ContractsPageClientProps = {
  contracts: ContractWithRelations[];
  errorMessage?: string | null;
};

const statusLabels: Record<ContractWithRelations['status'], string> = {
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const typeLabels: Record<ContractWithRelations['type'], string> = {
  PURCHASE: 'Purchase',
  SALE: 'Sale',
};

const formatDate = (date: string | Date) => {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return '—';
  }

  return parsedDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getStatusColor = (status: ContractWithRelations['status']) => {
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-100 text-green-800';
    case 'COMPLETED':
      return 'bg-blue-100 text-blue-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getTypeColor = (type: ContractWithRelations['type']) => {
  return type === 'PURCHASE' ? 'text-blue-600 bg-blue-50' : 'text-green-600 bg-green-50';
};

export function ContractsPageClient({ contracts: initialContracts, errorMessage }: ContractsPageClientProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const contracts = useMemo(() => initialContracts ?? [], [initialContracts]);

  const filteredContracts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return contracts.filter(contract => {
      const commodityName = contract.commodity?.name?.toLowerCase() ?? '';
      const counterpartyName = contract.counterparty?.name?.toLowerCase() ?? '';
      const matchesSearch =
        !search ||
        commodityName.includes(search) ||
        counterpartyName.includes(search) ||
        contract.id.toLowerCase().includes(search);

      const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
      const matchesType = typeFilter === 'all' || contract.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [contracts, searchTerm, statusFilter, typeFilter]);

  const totalContractValue = useMemo(
    () => contracts.reduce((sum, contract) => sum + contract.totalValue, 0),
    [contracts],
  );
  const activeContracts = useMemo(
    () => contracts.filter(contract => contract.status === 'ACTIVE'),
    [contracts],
  );
  const totalExecuted = useMemo(
    () => contracts.reduce((sum, contract) => sum + contract.executed * contract.price, 0),
    [contracts],
  );
  const averageContractValue = useMemo(
    () => (contracts.length > 0 ? Math.round(totalContractValue / contracts.length) : 0),
    [contracts.length, totalContractValue],
  );

  const handleContractCreated = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
    router.refresh();
  };

  if (errorMessage) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-2 text-center">
        <p className="text-lg font-semibold text-slate-900">Unable to load contracts</p>
        <p className="text-sm text-slate-600">{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Contracts</h1>
          <p className="text-slate-600 mt-2">Manage your commodity purchase and sale contracts</p>
        </div>
        <ContractModal onContractCreated={handleContractCreated} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalContractValue.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1">All contracts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Active Contracts</CardTitle>
            <FileText className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeContracts.length}</div>
            <p className="text-xs text-slate-500 mt-1">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Executed Value</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalExecuted.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1">Completed trades</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Avg. Contract Size</CardTitle>
            <FileText className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${averageContractValue.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1">Per contract</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <CardTitle>All Contracts</CardTitle>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search contracts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={value => setStatusFilter(value as StatusFilter)}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ACTIVE">{statusLabels.ACTIVE}</SelectItem>
                  <SelectItem value="COMPLETED">{statusLabels.COMPLETED}</SelectItem>
                  <SelectItem value="CANCELLED">{statusLabels.CANCELLED}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={value => setTypeFilter(value as TypeFilter)}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="PURCHASE">{typeLabels.PURCHASE}</SelectItem>
                  <SelectItem value="SALE">{typeLabels.SALE}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {filteredContracts.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Contract ID</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Commodity</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Counterparty</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Quantity</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Price</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Total Value</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Progress</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">End Date</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContracts.map((contract) => {
                    const progressPercent = contract.quantity > 0
                      ? Math.min(100, Math.max(0, (contract.executed / contract.quantity) * 100))
                      : 0;

                    return (
                      <tr key={contract.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 font-medium text-slate-900">{contract.id}</td>
                        <td className="py-3 px-4 text-slate-700">{contract.commodity?.name}</td>
                        <td className="py-3 px-4 text-slate-700">{contract.counterparty?.name}</td>
                        <td className="py-3 px-4">
                          <Badge className={getTypeColor(contract.type)}>{typeLabels[contract.type]}</Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-700">{contract.quantity.toLocaleString()}</td>
                        <td className="py-3 px-4 text-slate-700">${contract.price.toFixed(2)}</td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          ${contract.totalValue.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 bg-slate-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${progressPercent}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-slate-600">{progressPercent.toFixed(0)}%</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {contract.executed.toLocaleString()} / {contract.quantity.toLocaleString()}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={getStatusColor(contract.status)}>{statusLabels[contract.status]}</Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-700">{formatDate(contract.endDate)}</td>
                        <td className="py-3 px-4">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/contracts/${contract.id}`}>View</Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="py-12 text-center">
                <p className="text-sm font-medium text-slate-900">No contracts match your filters.</p>
                <p className="text-sm text-slate-600 mt-1">Try adjusting the search or filter criteria.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
