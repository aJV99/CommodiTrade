import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCommodities,
  getCommodityById,
  createCommodity,
  updateCommodity,
  updateCommodityPrice,
  batchUpdateCommodityPrices,
  deleteCommodity,
  getCommodityMarketSummary,
  getCommodityPriceHistory,
  type CommodityFilters,
  type CommodityListItem,
  type CommodityPriceHistoryOptions,
  type CommodityWithRelations,
} from "@/lib/database/commodities";
export function useCommodities(filters?: CommodityFilters) {
  return useQuery<CommodityListItem[]>({
    queryKey: ["commodities", filters],
    queryFn: () => getCommodities(filters),
  });
}

export function useCommodityById(id: string) {
  return useQuery<CommodityWithRelations>({
    queryKey: ["commodity", id],
    queryFn: () => getCommodityById(id),
    enabled: !!id,
    refetchOnWindowFocus: true,
  });
}

export function useCommodityMarketSummary() {
  return useQuery({
    queryKey: ["commodity-market-summary"],
    queryFn: getCommodityMarketSummary,
  });
}

export function useCommodityPriceHistory(
  id: string,
  options?: CommodityPriceHistoryOptions,
) {
  return useQuery({
    queryKey: ["commodity-price-history", id, options],
    queryFn: () => getCommodityPriceHistory(id, options),
    enabled: !!id,
  });
}

export function useCreateCommodity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCommodity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commodities"] });
      queryClient.invalidateQueries({ queryKey: ["commodity-market-summary"] });
    },
  });
}

export function useUpdateCommodity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateCommodity(id, data),
    onSuccess: (commodity) => {
      queryClient.invalidateQueries({ queryKey: ["commodities"] });
      queryClient.invalidateQueries({ queryKey: ["commodity-market-summary"] });
      if (commodity?.id) {
        queryClient.invalidateQueries({
          queryKey: ["commodity", commodity.id],
        });
      }
    },
  });
}

export function useUpdateCommodityPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCommodityPrice,
    onSuccess: (commodity) => {
      queryClient.invalidateQueries({ queryKey: ["commodities"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-valuation"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-statistics"] });
      if (commodity?.id) {
        queryClient.invalidateQueries({
          queryKey: ["commodity", commodity.id],
        });
        queryClient.invalidateQueries({
          queryKey: ["commodity-price-history", commodity.id],
        });
      }
    },
  });
}

export function useBatchUpdateCommodityPrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: batchUpdateCommodityPrices,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commodities"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-valuation"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-statistics"] });
    },
  });
}

export function useDeleteCommodity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCommodity,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["commodities"] });
      queryClient.invalidateQueries({ queryKey: ["commodity-market-summary"] });
      if (id) {
        queryClient.removeQueries({ queryKey: ["commodity", id] });
        queryClient.removeQueries({
          queryKey: ["commodity-price-history", id],
        });
      }
    },
  });
}
