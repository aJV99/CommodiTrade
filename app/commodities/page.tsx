"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, SlidersHorizontal } from "lucide-react";
import { CommodityModal } from "@/components/modals/commodity-modal";
import { cn } from "@/lib/utils";
import { useCommodities } from "@/lib/hooks/use-commodities";
import type {
  CommodityFilters,
  CommodityListItem,
} from "@/lib/database/commodities";
import { CommodityType } from "@prisma/client";
import { useToast } from "@/hooks/use-toast";
const typeOptions: Array<{ label: string; value: CommodityType | "ALL" }> = [
  { label: "All Types", value: "ALL" },
  ...Object.values(CommodityType).map((type) => ({
    label: type.charAt(0) + type.slice(1).toLowerCase(),
    value: type,
  })),
];
const directionOptions = [
  { label: "All", value: "all" },
  { label: "Gainers", value: "positive" },
  { label: "Losers", value: "negative" },
  { label: "Flat", value: "neutral" },
] as const;
const getTypeColor = (type: CommodityType) => {
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
export default function CommoditiesPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<CommodityType | "ALL">("ALL");
  const [directionFilter, setDirectionFilter] =
    useState<(typeof directionOptions)[number]["value"]>("all");
  const [priceBounds, setPriceBounds] = useState<[number, number] | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);
  const [appliedPriceRange, setAppliedPriceRange] = useState<
    [number, number] | null
  >(null);
  const filters = useMemo<CommodityFilters>(() => {
    const nextFilters: CommodityFilters = {};
    if (typeFilter !== "ALL") {
      nextFilters.type = typeFilter;
    }
    if (directionFilter !== "all") {
      nextFilters.priceChangeDirection = directionFilter;
    }
    if (priceBounds && appliedPriceRange) {
      nextFilters.minPrice = appliedPriceRange[0];
      nextFilters.maxPrice = appliedPriceRange[1];
    }
    return nextFilters;
  }, [typeFilter, directionFilter, priceBounds, appliedPriceRange]);
  const {
    data: commodities = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useCommodities(filters);
  useEffect(() => {
    if (error) {
      toast({
        title: "Unable to load commodities",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }, [error, toast]);
  useEffect(() => {
    if (!commodities.length) {
      return;
    }
    const prices = commodities.map((commodity) => commodity.currentPrice);
    const minPrice = Math.floor(Math.min(...prices));
    const maxPrice = Math.ceil(Math.max(...prices));
    setPriceBounds((current) => {
      if (!current) {
        setPriceRange([minPrice, maxPrice]);
        setAppliedPriceRange(null);
        return [minPrice, maxPrice];
      }
      return current;
    });
  }, [commodities]);
  const filteredBySearch = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    return commodities.filter((commodity) =>
      commodity.name.toLowerCase().includes(lowerSearch),
    );
  }, [commodities, searchTerm]);

  const hasFilteredCommodities = filteredBySearch.length > 0;
  const renderSkeletonRows = () => (
    <tbody>
      {Array.from({ length: 6 }).map((_, index) => (
        <tr key={index} className="border-b border-slate-100">
          {Array.from({ length: 11 }).map((__, cellIndex) => (
            <td key={cellIndex} className="py-3 px-4">
              <Skeleton className="h-5 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Commodities</h1>
          <p className="text-slate-600 mt-2">
            Monitor live prices and associated activity across the book.
          </p>
        </div>
        <CommodityModal onCommodityCreated={refetch} />
      </div>
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>All Commodities</CardTitle>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search commodities..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={typeFilter}
                onValueChange={(value) =>
                  setTypeFilter(value as CommodityType | "ALL")
                }
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Commodity type" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase text-slate-500">
                  Price direction
                </span>
                <ToggleGroup
                  type="single"
                  value={directionFilter}
                  onValueChange={(value) =>
                    setDirectionFilter(
                      (value as (typeof directionOptions)[number]["value"]) ||
                        "all",
                    )
                  }
                  className="flex"
                >
                  {directionOptions.map((option) => (
                    <ToggleGroupItem
                      key={option.value}
                      value={option.value}
                      aria-label={option.label}
                      className="capitalize"
                    >
                      {option.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            </div>
          </div>
          {priceBounds && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm font-medium text-slate-600">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Price range (${priceRange[0].toFixed(2)} - $
                  {priceRange[1].toFixed(2)})
                </div>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setPriceRange(priceBounds);
                    setAppliedPriceRange(null);
                  }}
                >
                  Reset
                </Button>
              </div>
              <Slider
                value={priceRange}
                min={priceBounds[0]}
                max={priceBounds[1]}
                step={1}
                onValueChange={(value) =>
                  setPriceRange(value as [number, number])
                }
                onValueCommit={(value) => {
                  const committed = value as [number, number];
                  if (
                    committed[0] === priceBounds[0] &&
                    committed[1] === priceBounds[1]
                  ) {
                    setAppliedPriceRange(null);
                  } else {
                    setAppliedPriceRange(committed);
                  }
                }}
              />
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-3 px-4 text-left">Name</th>
                    <th className="py-3 px-4 text-left">Type</th>
                    <th className="py-3 px-4 text-left">Unit</th>
                    <th className="py-3 px-4 text-left">Current Price</th>
                    <th className="py-3 px-4 text-left">Change</th>
                    <th className="py-3 px-4 text-left">% Change</th>
                    <th className="py-3 px-4 text-left">Trades</th>
                    <th className="py-3 px-4 text-left">Inventory Lots</th>
                    <th className="py-3 px-4 text-left">Contracts</th>
                    <th className="py-3 px-4 text-left">Shipments</th>
                    <th className="py-3 px-4 text-left">Actions</th>
                  </tr>
                </thead>
                {isLoading ? (
                  renderSkeletonRows()
                ) : !hasFilteredCommodities ? (
                  <tbody>
                    <tr>
                      <td
                        colSpan={11}
                        className="py-10 text-center text-slate-500"
                      >
                        No commodities match the current filters.
                        <div className="mt-2">
                          <Button variant="outline" onClick={() => refetch()}>
                            Refresh list
                          </Button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                ) : (
                  <tbody>
                    {filteredBySearch.map((commodity: CommodityListItem) => (
                      <tr
                        key={commodity.id}
                        className="border-b border-slate-100 transition hover:bg-slate-50"
                      >
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {commodity.name}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={getTypeColor(commodity.type)}>
                            {commodity.type}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {commodity.unit}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          ${commodity.currentPrice.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {commodity.priceChange >= 0 ? "+" : ""}
                          {commodity.priceChange.toFixed(2)}
                        </td>
                        <td
                          className={`py-3 px-4 font-medium ${
                            commodity.priceChange >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {commodity.priceChangePercent.toFixed(2)}%
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          <Badge variant="outline" className="font-medium">
                            {commodity._count.trades}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          <Badge variant="outline" className="font-medium">
                            {commodity._count.inventory}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          <Badge variant="outline" className="font-medium">
                            {commodity._count.contracts}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          <Badge variant="outline" className="font-medium">
                            {commodity._count.shipments}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Link href={`/commodities/${commodity.id}`}>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                )}
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
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))
            ) : !hasFilteredCommodities ? (
              <div className="rounded-lg border border-dashed border-muted-foreground/40 p-6 text-center text-sm text-muted-foreground">
                No commodities match the current filters.
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    Refresh list
                  </Button>
                </div>
              </div>
            ) : (
              filteredBySearch.map((commodity: CommodityListItem) => (
                <div
                  key={commodity.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-card-foreground">
                        {commodity.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {commodity.unit}
                      </p>
                    </div>
                    <Badge className={getTypeColor(commodity.type)}>
                      {commodity.type}
                    </Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                    <div>
                      <p className="text-xs uppercase tracking-wide">Price</p>
                      <p className="font-medium text-card-foreground">
                        ${commodity.currentPrice.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide">Change</p>
                      <p
                        className={cn(
                          "font-medium",
                          commodity.priceChange >= 0
                            ? "text-green-600"
                            : "text-red-600",
                        )}
                      >
                        {commodity.priceChange >= 0 ? "+" : ""}
                        {commodity.priceChange.toFixed(2)} (
                        {commodity.priceChangePercent >= 0 ? "+" : ""}
                        {commodity.priceChangePercent.toFixed(1)}%)
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide">Trades</p>
                      <p className="font-medium text-card-foreground">
                        {commodity._count.trades}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide">
                        Contracts
                      </p>
                      <p className="font-medium text-card-foreground">
                        {commodity._count.contracts}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide">Lots</p>
                      <p className="font-medium text-card-foreground">
                        {commodity._count.inventory}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide">
                        Shipments
                      </p>
                      <p className="font-medium text-card-foreground">
                        {commodity._count.shipments}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <Link href={`/commodities/${commodity.id}`}>
                      <Button size="sm" variant="secondary">
                        View commodity
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
          {isFetching && !isLoading && (
            <div className="mt-4 text-center text-xs text-slate-500">
              Updating data...
            </div>
          )}
          {error && (
            <div className="mt-4 flex flex-col items-center gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <span>We couldn&apos;t load the commodities list.</span>
              <Button variant="destructive" size="sm" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
