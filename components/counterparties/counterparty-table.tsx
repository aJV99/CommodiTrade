"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import type {
  Counterparty,
  Contract,
  CreditRating,
  CounterpartyType,
} from "@prisma/client";

export type CounterpartyTableRow = Counterparty & {
  contracts: Pick<Contract, "id" | "status" | "totalValue">[];
  _count: {
    contracts: number;
  };
};

interface CounterpartyTableProps {
  data: CounterpartyTableRow[];
  onView: (id: string) => void;
  onEdit: (counterparty: CounterpartyTableRow) => void;
  onCredit: (counterparty: CounterpartyTableRow) => void;
  onDelete: (counterparty: CounterpartyTableRow) => void;
  emptyMessage?: string;
  pagination?: {
    page: number;
    onPrevious: () => void;
    onNext: () => void;
    hasNextPage: boolean;
    isFetching?: boolean;
  };
}

const ratingColors: Record<CreditRating, string> = {
  AAA: "bg-emerald-100 text-emerald-700",
  AA: "bg-emerald-100 text-emerald-700",
  A: "bg-sky-100 text-sky-700",
  BBB: "bg-amber-100 text-amber-700",
  BB: "bg-orange-100 text-orange-700",
  B: "bg-red-100 text-red-700",
};

const typeColors: Record<CounterpartyType, string> = {
  SUPPLIER: "bg-blue-100 text-blue-700",
  CUSTOMER: "bg-green-100 text-green-700",
  BOTH: "bg-purple-100 text-purple-700",
};

const typeLabels: Record<CounterpartyType, string> = {
  SUPPLIER: "Supplier",
  CUSTOMER: "Customer",
  BOTH: "Supplier & Customer",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

export function CounterpartyTable({
  data,
  onView,
  onEdit,
  onCredit,
  onDelete,
  emptyMessage = "No counterparties match your filters.",
  pagination,
}: CounterpartyTableProps) {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[220px]">Company</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead className="min-w-[180px]">Credit exposure</TableHead>
              <TableHead>Total trades</TableHead>
              <TableHead>Contracts</TableHead>
              <TableHead className="min-w-[200px]">Contact</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((counterparty) => {
              const creditLimit = counterparty.creditLimit || 0;
              const creditUsed = counterparty.creditUsed || 0;
              const utilization =
                creditLimit > 0
                  ? Math.min(100, (creditUsed / creditLimit) * 100)
                  : 0;
              const available = creditLimit - creditUsed;
              const activeContracts = counterparty.contracts.filter(
                (contract) => contract.status === "ACTIVE",
              ).length;

              return (
                <TableRow key={counterparty.id} className="bg-white">
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-900">
                        {counterparty.name}
                      </div>
                      <div className="text-sm text-slate-500">
                        {counterparty.contactPerson}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`${typeColors[counterparty.type]} font-medium`}
                    >
                      {typeLabels[counterparty.type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-700">
                    {counterparty.country}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`${ratingColors[counterparty.rating]} font-semibold`}
                    >
                      {counterparty.rating}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <span>{formatCurrency(creditUsed)}</span>
                        <span className="font-medium text-slate-900">
                          {formatCurrency(creditLimit)}
                        </span>
                      </div>
                      <Progress value={utilization} />
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{utilization.toFixed(1)}% used</span>
                        <span>
                          Avail. {formatCurrency(Math.max(0, available))}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-sm">
                      <div className="font-semibold text-slate-900">
                        {counterparty.totalTrades}
                      </div>
                      <div className="text-slate-500">
                        Volume {counterparty.totalVolume.toLocaleString()}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-sm">
                      <div className="font-semibold text-slate-900">
                        {counterparty._count?.contracts ?? 0}
                      </div>
                      <div className="text-slate-500">
                        {activeContracts} active
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-sm text-slate-600">
                      <div>{counterparty.email}</div>
                      <div>{counterparty.phone}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => onView(counterparty.id)}
                        >
                          View profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(counterparty)}>
                          Edit details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onCredit(counterparty)}
                        >
                          Update credit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => onDelete(counterparty)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {data.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="h-32 text-center text-sm text-slate-500"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {pagination && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Page {pagination.page + 1}</p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={pagination.onPrevious}
              disabled={pagination.page === 0 || pagination.isFetching}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={pagination.onNext}
              disabled={!pagination.hasNextPage || pagination.isFetching}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
