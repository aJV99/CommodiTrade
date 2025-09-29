"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { TradeModal } from "@/components/modals/trade-modal";
import {
  useTrades,
  useTradeStatistics,
  useTradeById,
} from "@/lib/hooks/use-trades";
import { TradeStatus, TradeType } from "@prisma/client";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useCommodities } from "@/lib/hooks/use-commodities";

export default function TradingPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-muted-foreground">Loading trades…</div>
      }
    >
      <TradingPageContent />
    </Suspense>
  );
}

function TradingPageContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const searchParams = useSearchParams();
  const router = useRouter();
  const commodityIdFilter = searchParams.get("commodityId") ?? undefined;
  const editTradeId = searchParams.get("editTradeId");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { data: commodities = [] } = useCommodities();

  const {
    data: trades = [],
    isLoading,
    error,
    refetch,
  } = useTrades({
    status: statusFilter !== "all" ? (statusFilter as TradeStatus) : undefined,
    type: typeFilter !== "all" ? (typeFilter as TradeType) : undefined,
    commodityId: commodityIdFilter,
  });

  const { data: statistics, isLoading: statisticsLoading } =
    useTradeStatistics();

  const { data: tradeToEdit, isLoading: isEditLoading } = useTradeById(
    editTradeId ?? "",
    {
      enabled: Boolean(editTradeId),
    },
  );

  useEffect(() => {
    if (editTradeId) {
      setIsEditModalOpen(true);
    }
  }, [editTradeId]);

  const clearEditQuery = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("editTradeId");
    const queryString = params.toString();
    router.push(queryString ? `/trading?${queryString}` : "/trading");
  }, [router, searchParams]);

  const handleEditModalChange = useCallback(
    (open: boolean) => {
      setIsEditModalOpen(open);
      if (!open) {
        clearEditQuery();
      }
    },
    [clearEditQuery],
  );

  const filteredTrades = trades.filter((trade) => {
    if (!searchTerm) return true;
    return (
      trade.commodity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.counterparty.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      trade.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const hasFilteredTrades = filteredTrades.length > 0;

  const commodityFilterLabel = useMemo(() => {
    if (!commodityIdFilter) return undefined;
    return commodities.find((commodity) => commodity.id === commodityIdFilter)
      ?.name;
  }, [commodities, commodityIdFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-blue-100 text-blue-800";
      case "EXECUTED":
        return "bg-green-100 text-green-800";
      case "SETTLED":
        return "bg-gray-100 text-gray-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeColor = (type: string) => {
    return type === "BUY"
      ? "text-green-600 bg-green-50"
      : "text-red-600 bg-red-50";
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Trading</h1>
          <p className="text-slate-600 mt-2">
            Manage your commodity trades and orders
          </p>
        </div>
        <TradeModal mode="create" onSuccess={refetch} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Notional
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-900">
              {statisticsLoading
                ? "—"
                : `$${(statistics?.totalValue ?? 0).toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}`}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all recorded trades
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open Trades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-900">
              {statisticsLoading ? "—" : (statistics?.openTrades ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Trades awaiting execution
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Executed Trades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-900">
              {statisticsLoading ? "—" : (statistics?.executedTrades ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting settlement logistics
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cancelled Trades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-900">
              {statisticsLoading ? "—" : (statistics?.cancelledTrades ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Removed from the execution stack
            </p>
          </CardContent>
        </Card>
      </div>

      {commodityIdFilter && (
        <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          <span>
            Commodity filter:{" "}
            <span className="font-semibold">
              {commodityFilterLabel ?? "Selected commodity"}
            </span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => router.push("/trading")}
          >
            Clear
          </Button>
        </div>
      )}

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
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-600">
                      Trade ID
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">
                      Commodity
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">
                      Type
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">
                      Quantity
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">
                      Price
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">
                      Total Value
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">
                      Counterparty
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">
                      Trade Date
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {error ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="py-6 text-center text-sm text-destructive"
                      >
                        Unable to load trades. Please refresh the page or try
                        again shortly.
                      </td>
                    </tr>
                  ) : !hasFilteredTrades ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        No trades match your current filters.
                        <div className="mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSearchTerm("");
                              setStatusFilter("all");
                              setTypeFilter("all");
                              if (commodityIdFilter) {
                                router.push("/trading");
                              }
                            }}
                          >
                            Clear filters
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTrades.map((trade) => (
                      <tr
                        key={trade.id}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {trade.id}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {trade.commodity.name}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={getTypeColor(trade.type)}>
                            {trade.type}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {trade.quantity.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          ${trade.price.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          ${trade.totalValue.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {trade.counterparty.name}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={getStatusColor(trade.status)}>
                            {trade.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {new Date(trade.tradeDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <Link href={`/trading/${trade.id}`}>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="space-y-4 md:hidden">
            {error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                Unable to load trades. Please refresh the page or try again
                shortly.
              </div>
            ) : !hasFilteredTrades ? (
              <div className="rounded-lg border border-dashed border-muted-foreground/40 p-6 text-center text-sm text-muted-foreground">
                No trades match your current filters.
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                      setTypeFilter("all");
                      if (commodityIdFilter) {
                        router.push("/trading");
                      }
                    }}
                  >
                    Clear filters
                  </Button>
                </div>
              </div>
            ) : (
              filteredTrades.map((trade) => (
                <div
                  key={trade.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-card-foreground">
                        {trade.commodity.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {trade.id}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={getStatusColor(trade.status)}>
                        {trade.status}
                      </Badge>
                      <Badge className={getTypeColor(trade.type)}>
                        {trade.type}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                    <div>
                      <p className="text-xs uppercase tracking-wide">
                        Quantity
                      </p>
                      <p className="font-medium text-card-foreground">
                        {trade.quantity.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide">Price</p>
                      <p className="font-medium text-card-foreground">
                        ${trade.price.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide">
                        Counterparty
                      </p>
                      <p className="font-medium text-card-foreground">
                        {trade.counterparty.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide">
                        Trade Date
                      </p>
                      <p className="font-medium text-card-foreground">
                        {new Date(trade.tradeDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Total Value
                      </p>
                      <p className="text-lg font-semibold text-card-foreground">
                        ${trade.totalValue.toLocaleString()}
                      </p>
                    </div>
                    <Link href={`/trading/${trade.id}`}>
                      <Button size="sm" variant="secondary">
                        View trade
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {editTradeId && (
        <TradeModal
          mode="edit"
          trade={tradeToEdit ?? null}
          isLoading={isEditLoading}
          open={isEditModalOpen}
          onOpenChange={handleEditModalChange}
          onSuccess={() => {
            refetch();
            clearEditQuery();
          }}
        />
      )}
    </div>
  );
}
