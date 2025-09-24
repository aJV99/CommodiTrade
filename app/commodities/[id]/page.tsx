"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ArrowLeft, Download, TrendingDown, TrendingUp } from "lucide-react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  useCommodityById,
  useCommodityPriceHistory,
} from "@/lib/hooks/use-commodities";
import { CommodityModal } from "@/components/modals/commodity-modal";
import { UpdatePriceModal } from "@/components/modals/update-price-modal";
import { DeleteCommodityModal } from "@/components/modals/delete-commodity-modal";
import {
  type CommodityWithRelations,
  type PriceHistoryGranularity,
} from "@/lib/database/commodities";
import { useToast } from "@/hooks/use-toast";

const HISTORY_WINDOWS = [7, 30, 90] as const;

const granularityLabels: Record<PriceHistoryGranularity, string> = {
  daily: "Daily",
  weekly: "Weekly",
};

const getTypeColor = (type: CommodityWithRelations["type"]) => {
  switch (type) {
    case "AGRICULTURAL":
      return "bg-green-100 text-green-800";
    case "ENERGY":
      return "bg-yellow-100 text-yellow-800";
    case "METALS":
      return "bg-gray-100 text-gray-800";
    case "LIVESTOCK":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-slate-100 text-slate-800";
  }
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

const downloadCsv = (
  filename: string,
  headers: string[],
  rows: (string | number)[][],
) => {
  const encode = (value: string | number) =>
    `"${String(value).replace(/"/g, '""')}"`;
  const csv = [
    headers.map(encode).join(","),
    ...rows.map((row) => row.map(encode).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-10 w-52" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function CommodityDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { toast } = useToast();

  const [days, setDays] = useState<(typeof HISTORY_WINDOWS)[number]>(30);
  const [granularity, setGranularity] =
    useState<PriceHistoryGranularity>("daily");

  const { data: commodity, isLoading, error, refetch } = useCommodityById(id);

  const {
    data: priceData,
    isLoading: historyLoading,
    error: historyError,
    refetch: refetchHistory,
  } = useCommodityPriceHistory(id, { days, granularity });

  useEffect(() => {
    if (error) {
      toast({
        title: "Unable to load commodity",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  useEffect(() => {
    if (historyError) {
      toast({
        title: "Price history unavailable",
        description: (historyError as Error).message,
        variant: "destructive",
      });
    }
  }, [historyError, toast]);

  const inventoryStats = useMemo(() => {
    if (!commodity) {
      return {
        quantity: 0,
        marketValue: 0,
        cost: 0,
        averageCost: 0,
        averageMarket: 0,
        markToMarket: 0,
      };
    }

    const totals = commodity.inventory.reduce(
      (acc, item) => {
        const lotMarketValue = item.quantity * item.marketValue;
        const lotCost = item.quantity * item.costBasis;

        return {
          quantity: acc.quantity + item.quantity,
          marketValue: acc.marketValue + lotMarketValue,
          cost: acc.cost + lotCost,
        };
      },
      { quantity: 0, marketValue: 0, cost: 0 },
    );

    const averageCost = totals.quantity ? totals.cost / totals.quantity : 0;
    const averageMarket = totals.quantity
      ? totals.marketValue / totals.quantity
      : 0;

    return {
      ...totals,
      averageCost,
      averageMarket,
      markToMarket: totals.marketValue - totals.cost,
    };
  }, [commodity]);

  const contractStats = useMemo(() => {
    if (!commodity) {
      return { quantity: 0, remaining: 0, value: 0 };
    }

    return commodity.contracts.reduce(
      (acc, contract) => ({
        quantity: acc.quantity + contract.quantity,
        remaining: acc.remaining + (contract.remaining ?? 0),
        value: acc.value + contract.quantity * contract.price,
      }),
      { quantity: 0, remaining: 0, value: 0 },
    );
  }, [commodity]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !commodity) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">
            Commodity unavailable
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            We couldn&apos;t retrieve this commodity. Please try again or return
            to the list.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="default">
            Retry
          </Button>
          <Button onClick={() => router.push("/commodities")} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to commodities
          </Button>
        </div>
      </div>
    );
  }

  const priceHistory = priceData?.history ?? [];
  const priceChangePositive = commodity.priceChange >= 0;

  const handleExportHistory = () => {
    if (!priceHistory.length) {
      toast({
        title: "No price data",
        description: "There is no price history to export for this window.",
      });
      return;
    }

    downloadCsv(
      `${commodity.name}-price-history-${granularity}.csv`,
      ["Date", "Average Price", "Volume"],
      priceHistory.map((row) => [row.date, row.price, row.volume]),
    );

    toast({
      title: "Price history exported",
      description: `Saved ${priceHistory.length} data points to CSV.`,
    });
  };

  const handleExportTable = (
    type: "trades" | "inventory" | "contracts" | "shipments",
  ) => {
    switch (type) {
      case "trades": {
        if (!commodity.trades.length) {
          toast({
            title: "No trades to export",
            description: "Execute a trade before exporting this report.",
          });
          return;
        }

        downloadCsv(
          `${commodity.name}-trades.csv`,
          ["Trade Date", "Quantity", "Price", "Status", "Total Value"],
          commodity.trades.map((trade) => [
            new Date(trade.tradeDate).toISOString(),
            trade.quantity,
            trade.price,
            trade.status,
            trade.totalValue,
          ]),
        );
        toast({
          title: "Trade report exported",
          description: `Saved ${commodity.trades.length} trades to CSV.`,
        });
        break;
      }
      case "inventory": {
        if (!commodity.inventory.length) {
          toast({
            title: "No inventory to export",
            description: "Add an inventory lot before exporting this report.",
          });
          return;
        }

        downloadCsv(
          `${commodity.name}-inventory.csv`,
          ["Warehouse", "Location", "Quantity", "Cost Basis", "Market Price"],
          commodity.inventory.map((lot) => [
            lot.warehouse,
            lot.location,
            lot.quantity,
            lot.costBasis,
            lot.marketValue,
          ]),
        );
        toast({
          title: "Inventory report exported",
          description: `Saved ${commodity.inventory.length} lots to CSV.`,
        });
        break;
      }
      case "contracts": {
        if (!commodity.contracts.length) {
          toast({
            title: "No contracts to export",
            description: "Create a contract before exporting this report.",
          });
          return;
        }

        downloadCsv(
          `${commodity.name}-contracts.csv`,
          ["Counterparty", "Quantity", "Remaining", "Status", "Price"],
          commodity.contracts.map((contract) => [
            contract.counterparty.name,
            contract.quantity,
            contract.remaining ?? 0,
            contract.status,
            contract.price,
          ]),
        );
        toast({
          title: "Contract report exported",
          description: `Saved ${commodity.contracts.length} contracts to CSV.`,
        });
        break;
      }
      case "shipments": {
        if (!commodity.shipments.length) {
          toast({
            title: "No shipments to export",
            description: "Schedule a shipment before exporting this report.",
          });
          return;
        }

        downloadCsv(
          `${commodity.name}-shipments.csv`,
          ["Tracking #", "Quantity", "Status", "ETA"],
          commodity.shipments.map((shipment) => [
            shipment.trackingNumber,
            shipment.quantity,
            shipment.status,
            shipment.expectedArrival?.toISOString() ?? "",
          ]),
        );
        toast({
          title: "Shipment report exported",
          description: `Saved ${commodity.shipments.length} shipments to CSV.`,
        });
        break;
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.push("/commodities")}
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <h1 className="text-3xl font-bold text-slate-900">
            {commodity.name}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <CommodityModal
            commodity={commodity}
            onCommodityUpdated={refetch}
            trigger={
              <Button variant="outline" size="sm">
                Edit
              </Button>
            }
          />
          <UpdatePriceModal
            commodityId={id}
            currentPrice={commodity.currentPrice}
            onPriceUpdated={() => {
              refetch();
              refetchHistory();
            }}
            trigger={
              <Button variant="outline" size="sm">
                Update price
              </Button>
            }
          />
          <DeleteCommodityModal
            commodityId={id}
            commodityName={commodity.name}
            onCommodityDeleted={() => router.push("/commodities")}
            trigger={
              <Button variant="destructive" size="sm">
                Delete
              </Button>
            }
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <Badge className={getTypeColor(commodity.type)}>
              {commodity.type}
            </Badge>
            <span>Unit: {commodity.unit}</span>
            <span>
              Last update: {new Date(commodity.updatedAt).toLocaleString()}
            </span>
          </div>
          <div className="text-3xl font-bold">
            {formatCurrency(commodity.currentPrice)}
            <span
              className={`ml-3 text-base font-semibold ${
                priceChangePositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {priceChangePositive ? (
                <TrendingUp className="mr-1 inline h-4 w-4" />
              ) : (
                <TrendingDown className="mr-1 inline h-4 w-4" />
              )}
              {commodity.priceChange.toFixed(2)} (
              {commodity.priceChangePercent.toFixed(2)}
              %)
            </span>
          </div>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-xs uppercase text-slate-500">Trades</div>
              <div className="mt-2 text-xl font-semibold text-slate-900">
                {commodity.trades.length}
              </div>
              <div className="text-xs text-slate-500">
                {formatCurrency(
                  commodity.trades.reduce(
                    (sum, trade) => sum + trade.totalValue,
                    0,
                  ),
                )}{" "}
                total value
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-xs uppercase text-slate-500">
                Inventory quantity
              </div>
              <div className="mt-2 text-xl font-semibold text-slate-900">
                {inventoryStats.quantity}
              </div>
              <div className="text-xs text-slate-500">
                {formatCurrency(inventoryStats.marketValue)} market value
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-xs uppercase text-slate-500">
                Mark-to-market
              </div>
              <div
                className={`mt-2 text-xl font-semibold ${
                  inventoryStats.markToMarket >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {formatCurrency(inventoryStats.markToMarket)}
              </div>
              <div className="text-xs text-slate-500">
                Avg cost {formatCurrency(inventoryStats.averageCost)}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-xs uppercase text-slate-500">
                Open contracts
              </div>
              <div className="mt-2 text-xl font-semibold text-slate-900">
                {contractStats.remaining}
              </div>
              <div className="text-xs text-slate-500">
                {formatCurrency(contractStats.value)} total value
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Price history</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Aggregated {granularityLabels[granularity].toLowerCase()} prices
              over the last {days} days.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              {HISTORY_WINDOWS.map((window) => (
                <Button
                  key={window}
                  variant={days === window ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDays(window)}
                >
                  {window}d
                </Button>
              ))}
            </div>
            <Select
              value={granularity}
              onValueChange={(value) =>
                setGranularity(value as PriceHistoryGranularity)
              }
            >
              <SelectTrigger className="sm:w-[160px]">
                <SelectValue placeholder="Granularity" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(granularityLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExportHistory}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <Skeleton className="h-80 w-full" />
          ) : priceHistory.length === 0 ? (
            <div className="flex h-80 items-center justify-center rounded-md border border-dashed border-slate-200 text-sm text-slate-500">
              No price ticks captured for this range.
            </div>
          ) : (
            <ChartContainer
              config={{
                price: { label: "Price", color: "hsl(var(--chart-1))" },
              }}
              className="h-80 w-full"
            >
              <LineChart data={priceHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={["auto", "auto"]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="var(--color-price)"
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Recent trades</CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/trading?commodityId=${id}`}>View all</Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportTable("trades")}
              >
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {commodity.trades.length === 0 ? (
              <p className="text-sm text-slate-500">No trades found.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase text-slate-500">
                    <th className="py-2 px-3 text-left">Date</th>
                    <th className="py-2 px-3 text-left">Quantity</th>
                    <th className="py-2 px-3 text-left">Status</th>
                    <th className="py-2 px-3 text-left">Total value</th>
                  </tr>
                </thead>
                <tbody>
                  {commodity.trades.slice(0, 5).map((trade) => (
                    <tr key={trade.id} className="border-b last:border-0">
                      <td className="py-2 px-3">
                        {new Date(trade.tradeDate).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-3">{trade.quantity}</td>
                      <td className="py-2 px-3">{trade.status}</td>
                      <td className="py-2 px-3">
                        {formatCurrency(trade.totalValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Inventory lots</CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/inventory?commodityId=${id}`}>View all</Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportTable("inventory")}
              >
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {commodity.inventory.length === 0 ? (
              <p className="text-sm text-slate-500">No inventory items.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase text-slate-500">
                    <th className="py-2 px-3 text-left">Warehouse</th>
                    <th className="py-2 px-3 text-left">Location</th>
                    <th className="py-2 px-3 text-left">Quantity</th>
                    <th className="py-2 px-3 text-left">Avg cost</th>
                    <th className="py-2 px-3 text-left">Market price</th>
                  </tr>
                </thead>
                <tbody>
                  {commodity.inventory.slice(0, 5).map((lot) => (
                    <tr key={lot.id} className="border-b last:border-0">
                      <td className="py-2 px-3">{lot.warehouse}</td>
                      <td className="py-2 px-3">{lot.location}</td>
                      <td className="py-2 px-3">{lot.quantity}</td>
                      <td className="py-2 px-3">
                        {formatCurrency(lot.costBasis)}
                      </td>
                      <td className="py-2 px-3">
                        {formatCurrency(lot.marketValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Contracts</CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/contracts?commodityId=${id}`}>View all</Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportTable("contracts")}
              >
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {commodity.contracts.length === 0 ? (
              <p className="text-sm text-slate-500">No contracts.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase text-slate-500">
                    <th className="py-2 px-3 text-left">Counterparty</th>
                    <th className="py-2 px-3 text-left">Quantity</th>
                    <th className="py-2 px-3 text-left">Remaining</th>
                    <th className="py-2 px-3 text-left">Status</th>
                    <th className="py-2 px-3 text-left">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {commodity.contracts.slice(0, 5).map((contract) => (
                    <tr key={contract.id} className="border-b last:border-0">
                      <td className="py-2 px-3">
                        {contract.counterparty.name}
                      </td>
                      <td className="py-2 px-3">{contract.quantity}</td>
                      <td className="py-2 px-3">{contract.remaining ?? 0}</td>
                      <td className="py-2 px-3">{contract.status}</td>
                      <td className="py-2 px-3">
                        {formatCurrency(contract.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Shipments</CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/shipments?commodityId=${id}`}>View all</Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportTable("shipments")}
              >
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {commodity.shipments.length === 0 ? (
              <p className="text-sm text-slate-500">No shipments.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase text-slate-500">
                    <th className="py-2 px-3 text-left">Tracking #</th>
                    <th className="py-2 px-3 text-left">Quantity</th>
                    <th className="py-2 px-3 text-left">Status</th>
                    <th className="py-2 px-3 text-left">ETA</th>
                  </tr>
                </thead>
                <tbody>
                  {commodity.shipments.slice(0, 5).map((shipment) => (
                    <tr key={shipment.id} className="border-b last:border-0">
                      <td className="py-2 px-3">{shipment.trackingNumber}</td>
                      <td className="py-2 px-3">{shipment.quantity}</td>
                      <td className="py-2 px-3">{shipment.status}</td>
                      <td className="py-2 px-3">
                        {shipment.expectedArrival
                          ? new Date(
                              shipment.expectedArrival,
                            ).toLocaleDateString()
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href={`/trading?commodityId=${id}`}>New trade</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/inventory?commodityId=${id}`}>Add inventory</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/shipments`}>Schedule shipment</Link>
        </Button>
      </div>
    </div>
  );
}
