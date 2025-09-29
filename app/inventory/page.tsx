"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Package,
  TrendingUp,
  TrendingDown,
  Filter as FilterIcon,
  MoreHorizontal,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { InventoryModal } from "@/components/modals/inventory-modal";
import { EditInventoryModal } from "@/components/modals/edit-inventory-modal";
import { DeleteInventoryModal } from "@/components/modals/delete-inventory-modal";
import { InventoryMovementModal } from "@/components/modals/inventory-movement-modal";
import { InventoryHistoryDrawer } from "@/components/inventory/inventory-history-drawer";
import {
  useInventory,
  useInventoryValuation,
  useLowStockAlerts,
} from "@/lib/hooks/use-inventory";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Commodity, InventoryItem } from "@prisma/client";

const SAVED_VIEWS_STORAGE_KEY = "inventory-saved-views";

type InventoryFilters = {
  commodityId?: string;
  warehouse?: string;
  location?: string;
};

type SavedView = {
  id: string;
  name: string;
  filters: InventoryFilters;
};

type InventoryWithCommodity = InventoryItem & { commodity: Commodity };

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const percentageFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatCurrency(value?: number | null) {
  if (value === undefined || value === null) {
    return "—";
  }
  return currencyFormatter.format(value);
}

export default function InventoryPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<InventoryFilters>({});
  const [newViewName, setNewViewName] = useState("");
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [selectedViewId, setSelectedViewId] = useState<string>("");
  const previousMarketValuesRef = useRef<Map<string, number>>(new Map());

  const normalizedFilters = useMemo(() => {
    const activeFilters: InventoryFilters = {};
    if (filters.commodityId) activeFilters.commodityId = filters.commodityId;
    if (filters.warehouse) activeFilters.warehouse = filters.warehouse;
    if (filters.location) activeFilters.location = filters.location;
    return activeFilters;
  }, [filters]);

  const {
    data: inventory = [],
    isLoading,
    error: inventoryError,
    refetch,
  } = useInventory(normalizedFilters);

  const inventoryRecords = inventory as InventoryWithCommodity[];

  const { data: valuation, error: valuationError } =
    useInventoryValuation(normalizedFilters);

  const { data: lowStockAlerts = [], error: lowStockError } =
    useLowStockAlerts(100);

  const lowStockRecords = lowStockAlerts as InventoryWithCommodity[];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(SAVED_VIEWS_STORAGE_KEY);
    if (stored) {
      try {
        const parsed: SavedView[] = JSON.parse(stored);
        setSavedViews(parsed);
      } catch (error) {
        console.error("Failed to parse inventory saved views", error);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      SAVED_VIEWS_STORAGE_KEY,
      JSON.stringify(savedViews),
    );
  }, [savedViews]);

  useEffect(() => {
    if (inventoryError) {
      toast({
        title: "Unable to load inventory",
        description:
          inventoryError instanceof Error
            ? inventoryError.message
            : "An unexpected error occurred while loading inventory data.",
        variant: "destructive",
      });
    }
  }, [inventoryError, toast]);

  useEffect(() => {
    if (valuationError) {
      toast({
        title: "Unable to calculate valuation",
        description:
          valuationError instanceof Error
            ? valuationError.message
            : "An unexpected error occurred while calculating valuation.",
        variant: "destructive",
      });
    }
  }, [valuationError, toast]);

  useEffect(() => {
    if (lowStockError) {
      toast({
        title: "Low stock alerts unavailable",
        description:
          lowStockError instanceof Error
            ? lowStockError.message
            : "An unexpected error occurred while fetching low stock alerts.",
        variant: "destructive",
      });
    }
  }, [lowStockError, toast]);

  useEffect(() => {
    if (!inventory || inventory.length === 0) {
      previousMarketValuesRef.current.clear();
      return;
    }

    const previousValues = previousMarketValuesRef.current;
    let changedLots = 0;
    const nextValues = new Map<string, number>();

    for (const item of inventory) {
      const previousValue = previousValues.get(item.id);
      if (previousValue !== undefined && previousValue !== item.marketValue) {
        changedLots += 1;
      }
      nextValues.set(item.id, item.marketValue);
    }

    previousMarketValuesRef.current = nextValues;

    if (previousValues.size > 0 && changedLots > 0) {
      toast({
        title: "Market prices refreshed",
        description: `${changedLots} ${changedLots === 1 ? "lot" : "lots"} updated after commodity price changes.`,
      });
    }
  }, [inventory, toast]);

  const filteredInventory = useMemo(() => {
    if (!inventoryRecords) return [];

    const lowerSearch = searchTerm.toLowerCase();

    return inventoryRecords.filter((item) => {
      const matchesSearch =
        lowerSearch.length === 0 ||
        item.commodity.name.toLowerCase().includes(lowerSearch) ||
        item.warehouse.toLowerCase().includes(lowerSearch) ||
        item.location.toLowerCase().includes(lowerSearch) ||
        item.quality.toLowerCase().includes(lowerSearch);

      return matchesSearch;
    });
  }, [inventoryRecords, searchTerm]);

  const hasFilteredInventory = filteredInventory.length > 0;

  const commodityOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of inventoryRecords) {
      seen.set(item.commodityId, item.commodity.name);
    }
    return Array.from(seen.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [inventoryRecords]);

  const warehouses = useMemo(() => {
    return Array.from(
      new Set(inventoryRecords.map((item) => item.warehouse)),
    ).sort();
  }, [inventoryRecords]);

  const locations = useMemo(() => {
    return Array.from(
      new Set(inventoryRecords.map((item) => item.location)),
    ).sort();
  }, [inventoryRecords]);

  const handleSaveView = () => {
    if (!newViewName.trim()) {
      toast({
        title: "Enter a view name",
        description: "Name your view before saving it for later use.",
        variant: "destructive",
      });
      return;
    }

    const view: SavedView = {
      id: crypto.randomUUID(),
      name: newViewName.trim(),
      filters: { ...normalizedFilters },
    };

    setSavedViews((current) => [...current, view]);
    setSelectedViewId(view.id);
    setNewViewName("");
    toast({
      title: "View saved",
      description: "Your inventory filters have been saved for quick access.",
    });
  };

  const applySavedView = (viewId: string) => {
    setSelectedViewId(viewId);
    const view = savedViews.find((saved) => saved.id === viewId);
    if (view) {
      setFilters(view.filters);
    }
  };

  const clearFilters = () => {
    setFilters({});
    setSelectedViewId("");
  };

  const renderValuationMetric = (
    label: string,
    icon: React.ReactNode,
    value?: number | null,
    subtitle?: string,
    trendColor?: string,
  ) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">
          {label}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(value)}</div>
        {subtitle && (
          <p className={cn("text-xs mt-1", trendColor)}>{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );

  const averagePnLPercent = valuation?.averageUnrealizedPnLPercent ?? 0;
  const pnLTrendColor =
    averagePnLPercent >= 0 ? "text-green-600" : "text-red-600";

  const renderInventoryActions = (
    item: InventoryWithCommodity,
    alignment: "start" | "end" = "end",
  ) => {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-2",
          alignment === "end" ? "justify-end" : "justify-start",
        )}
      >
        <InventoryHistoryDrawer
          inventory={item}
          trigger={
            <Button variant="outline" size="sm">
              History
            </Button>
          }
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1"
            >
              Manage
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <EditInventoryModal
              inventory={item}
              onUpdated={refetch}
              trigger={
                <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
                  Edit details
                </DropdownMenuItem>
              }
            />
            <InventoryMovementModal
              inventory={item}
              onMovementProcessed={refetch}
              trigger={
                <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
                  Adjust stock
                </DropdownMenuItem>
              }
            />
            <DeleteInventoryModal
              inventory={item}
              onDeleted={refetch}
              trigger={
                <DropdownMenuItem
                  onSelect={(event) => event.preventDefault()}
                  className="text-destructive focus:text-destructive"
                >
                  Remove lot
                </DropdownMenuItem>
              }
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Inventory Management
          </h1>
          <p className="text-slate-600 mt-2">
            Track your commodity lots, valuations, and warehouse positions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <InventoryModal onInventoryCreated={refetch} />
          <Button variant="outline" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {renderValuationMetric(
          "Total Value",
          <Package className="h-4 w-4 text-slate-400" />,
          valuation?.totalMarketValue,
          "Market value",
        )}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Unrealized P&L
            </CardTitle>
            {averagePnLPercent >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", pnLTrendColor)}>
              {formatCurrency(valuation?.totalUnrealizedPnL)}
            </div>
            <p className={cn("text-xs mt-1", pnLTrendColor)}>
              {percentageFormatter.format((averagePnLPercent || 0) / 100)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Lots
            </CardTitle>
            <Package className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryRecords.length}</div>
            <p className="text-xs text-slate-500 mt-1">
              Active inventory records
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Warehouses
            </CardTitle>
            <Package className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                new Set(
                  inventoryRecords.map(
                    (item) => `${item.warehouse}-${item.location}`,
                  ),
                ).size
              }
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Unique warehouse & location pairs
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <FilterIcon className="h-4 w-4" /> Filters & saved views
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Narrow the view by commodity, warehouse, or location and reuse
              saved combinations.
            </p>
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <Select
                  value={filters.commodityId ?? ""}
                  onValueChange={(value) =>
                    setFilters((current) => ({
                      ...current,
                      commodityId: value || undefined,
                    }))
                  }
                >
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Commodity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All commodities</SelectItem>
                    {commodityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filters.warehouse ?? ""}
                  onValueChange={(value) =>
                    setFilters((current) => ({
                      ...current,
                      warehouse: value || undefined,
                    }))
                  }
                >
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="Warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All warehouses</SelectItem>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse} value={warehouse}>
                        {warehouse}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filters.location ?? ""}
                  onValueChange={(value) =>
                    setFilters((current) => ({
                      ...current,
                      location: value || undefined,
                    }))
                  }
                >
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All locations</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <Input
                  value={newViewName}
                  onChange={(event) => setNewViewName(event.target.value)}
                  placeholder="Save view as…"
                  className="md:w-48"
                />
                <Button variant="secondary" onClick={handleSaveView}>
                  Save view
                </Button>
                <Select value={selectedViewId} onValueChange={applySavedView}>
                  <SelectTrigger className="md:w-48">
                    <SelectValue placeholder="Load saved view" />
                  </SelectTrigger>
                  <SelectContent>
                    {savedViews.length === 0 ? (
                      <SelectItem value="All" disabled>
                        No saved views yet
                      </SelectItem>
                    ) : (
                      savedViews.map((view) => (
                        <SelectItem key={view.id} value={view.id}>
                          {view.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button variant="ghost" onClick={clearFilters}>
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Inventory holdings</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search inventory…"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-10 w-full sm:w-72"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500">
                      <th className="py-3 px-4">Commodity</th>
                      <th className="py-3 px-4">Quantity</th>
                      <th className="py-3 px-4">Warehouse</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Quality</th>
                      <th className="py-3 px-4">Cost basis</th>
                      <th className="py-3 px-4">Market value</th>
                      <th className="py-3 px-4">Unrealized P&L</th>
                      <th className="py-3 px-4">Last updated</th>
                      <th className="py-3 px-4">Quick links</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading && (
                      <tr>
                        <td colSpan={11} className="py-6">
                          <div className="space-y-2">
                            {Array.from({ length: 5 }).map((_, index) => (
                              <Skeleton key={index} className="h-12 w-full" />
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}

                    {!isLoading && !hasFilteredInventory && (
                      <tr>
                        <td
                          colSpan={11}
                          className="py-10 text-center text-sm text-muted-foreground"
                        >
                          No inventory records match your filters. Adjust the
                          filters or add new stock.
                        </td>
                      </tr>
                    )}

                    {!isLoading &&
                      filteredInventory.map((item) => {
                        const unrealizedPnLPerUnit =
                          item.marketValue - item.costBasis;
                        const unrealizedPnL =
                          unrealizedPnLPerUnit * item.quantity;
                        const unrealizedPnLPercent =
                          item.costBasis > 0
                            ? (unrealizedPnLPerUnit / item.costBasis) * 100
                            : 0;

                        return (
                          <tr
                            key={item.id}
                            className="border-b border-slate-100 transition hover:bg-slate-50"
                          >
                            <td className="py-3 px-4 font-semibold text-slate-900">
                              {item.commodity.name}
                            </td>
                            <td className="py-3 px-4 text-slate-700">
                              {item.quantity.toLocaleString()} {item.unit}
                            </td>
                            <td className="py-3 px-4 text-slate-700">
                              {item.warehouse}
                            </td>
                            <td className="py-3 px-4 text-slate-700">
                              {item.location}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline">{item.quality}</Badge>
                            </td>
                            <td className="py-3 px-4 text-slate-700">
                              ${item.costBasis.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-slate-700">
                              ${item.marketValue.toFixed(2)}
                            </td>
                            <td className="py-3 px-4">
                              <div
                                className={cn(
                                  "font-medium",
                                  unrealizedPnL >= 0
                                    ? "text-green-600"
                                    : "text-red-600",
                                )}
                              >
                                {formatCurrency(unrealizedPnL)}
                                <div className="text-xs">
                                  ({unrealizedPnLPercent >= 0 ? "+" : ""}
                                  {unrealizedPnLPercent.toFixed(1)}%)
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-700">
                              {new Date(item.lastUpdated).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-slate-700">
                              <div className="flex flex-col gap-1 text-xs">
                                <Link
                                  href={`/commodities/${item.commodityId}`}
                                  className="text-blue-600 hover:underline"
                                >
                                  Commodity
                                </Link>
                                <Link
                                  href={`/trading?commodityId=${item.commodityId}`}
                                  className="text-blue-600 hover:underline"
                                >
                                  Related trades
                                </Link>
                                <Link
                                  href={`/shipments?commodityId=${item.commodityId}`}
                                  className="text-blue-600 hover:underline"
                                >
                                  Active shipments
                                </Link>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {renderInventoryActions(item)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="space-y-4 md:hidden">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-border bg-card p-4 shadow-sm"
                  >
                    <Skeleton className="h-4 w-32" />
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))
              ) : !hasFilteredInventory ? (
                <div className="rounded-lg border border-dashed border-muted-foreground/40 p-6 text-center text-sm text-muted-foreground">
                  No inventory records match your filters. Adjust the filters or
                  add new stock.
                </div>
              ) : (
                filteredInventory.map((item) => {
                  const unrealizedPnLPerUnit =
                    item.marketValue - item.costBasis;
                  const unrealizedPnL = unrealizedPnLPerUnit * item.quantity;
                  const unrealizedPnLPercent =
                    item.costBasis > 0
                      ? (unrealizedPnLPerUnit / item.costBasis) * 100
                      : 0;

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border bg-card p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-card-foreground">
                            {item.commodity.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Last updated{" "}
                            {new Date(item.lastUpdated).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant="outline">{item.quality}</Badge>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                        <div>
                          <p className="text-xs uppercase tracking-wide">
                            Quantity
                          </p>
                          <p className="font-medium text-card-foreground">
                            {item.quantity.toLocaleString()} {item.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide">
                            Warehouse
                          </p>
                          <p className="font-medium text-card-foreground">
                            {item.warehouse}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide">
                            Location
                          </p>
                          <p className="font-medium text-card-foreground">
                            {item.location}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide">
                            Cost basis
                          </p>
                          <p className="font-medium text-card-foreground">
                            ${item.costBasis.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide">
                            Market value
                          </p>
                          <p className="font-medium text-card-foreground">
                            ${item.marketValue.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide">
                            Unrealized P&amp;L
                          </p>
                          <p
                            className={cn(
                              "font-medium",
                              unrealizedPnL >= 0
                                ? "text-green-600"
                                : "text-red-600",
                            )}
                          >
                            {formatCurrency(unrealizedPnL)} (
                            {unrealizedPnLPercent >= 0 ? "+" : ""}
                            {unrealizedPnLPercent.toFixed(1)}%)
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-blue-600">
                        <Link
                          href={`/commodities/${item.commodityId}`}
                          className="hover:underline"
                        >
                          Commodity overview
                        </Link>
                        <Link
                          href={`/trading?commodityId=${item.commodityId}`}
                          className="hover:underline"
                        >
                          Related trades
                        </Link>
                        <Link
                          href={`/shipments?commodityId=${item.commodityId}`}
                          className="hover:underline"
                        >
                          Active shipments
                        </Link>
                      </div>
                      <div className="mt-4">
                        {renderInventoryActions(item, "start")}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Low stock
                alerts
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Lots approaching minimum levels. Top up or transfer inventory.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStockRecords.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No low stock risks detected for the current threshold.
                </p>
              )}
              {lowStockRecords.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-lg border border-amber-200 bg-amber-50 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-amber-900">
                        {alert.commodity.name}
                      </p>
                      <p className="text-xs text-amber-800">
                        {alert.warehouse} — {alert.location}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-amber-300 text-amber-800"
                    >
                      {alert.quantity.toLocaleString()} {alert.unit}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/trading?commodityId=${alert.commodityId}`}>
                      <Button size="sm" variant="secondary">
                        Create purchase trade
                      </Button>
                    </Link>
                    <InventoryMovementModal
                      inventory={alert}
                      onMovementProcessed={refetch}
                      trigger={<Button size="sm">Adjust stock</Button>}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Commodity valuation breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {valuation?.commodityBreakdown?.length ? (
              <div className="space-y-3">
                {valuation.commodityBreakdown.map((entry) => (
                  <div
                    key={entry.commodityId}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {entry.commodityName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.quantity.toLocaleString()} units
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-semibold">
                        {formatCurrency(entry.marketValue)}
                      </div>
                      <div
                        className={cn(
                          "text-xs",
                          entry.unrealizedPnL >= 0
                            ? "text-green-600"
                            : "text-red-600",
                        )}
                      >
                        {formatCurrency(entry.unrealizedPnL)} P&L
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No valuation data available for the current selection.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Warehouse concentration</CardTitle>
          </CardHeader>
          <CardContent>
            {valuation?.warehouseBreakdown?.length ? (
              <div className="space-y-3">
                {valuation.warehouseBreakdown.map((entry) => (
                  <div
                    key={entry.key}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {entry.warehouse}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.location}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-semibold">
                        {formatCurrency(entry.marketValue)}
                      </div>
                      <div
                        className={cn(
                          "text-xs",
                          entry.unrealizedPnL >= 0
                            ? "text-green-600"
                            : "text-red-600",
                        )}
                      >
                        {formatCurrency(entry.unrealizedPnL)} P&L
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No warehouse valuation data available.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
