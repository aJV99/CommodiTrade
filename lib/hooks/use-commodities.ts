import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getCommodities,
  getCommodityById,
  createCommodity,
  updateCommodity,
  updateCommodityPrice,
  batchUpdateCommodityPrices,
  deleteCommodity,
  getCommodityMarketSummary,
  getCommodityPriceHistory
} from '@/lib/database/commodities';
import { CommodityType } from '@prisma/client';

export function useCommodities(filters?: {
  type?: CommodityType;
  minPrice?: number;
  maxPrice?: number;
  priceChangeDirection?: 'positive' | 'negative' | 'neutral';
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['commodities', filters],
    queryFn: () => getCommodities(filters),
  });
}

export function useCommodityById(id: string) {
  return useQuery({
    queryKey: ['commodity', id],
    queryFn: () => getCommodityById(id),
    enabled: !!id,
  });
}

export function useCommodityMarketSummary() {
  return useQuery({
    queryKey: ['commodity-market-summary'],
    queryFn: getCommodityMarketSummary,
  });
}

export function useCommodityPriceHistory(id: string, days: number = 30) {
  return useQuery({
    queryKey: ['commodity-price-history', id, days],
    queryFn: () => getCommodityPriceHistory(id, days),
    enabled: !!id,
  });
}

export function useCreateCommodity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createCommodity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commodities'] });
      queryClient.invalidateQueries({ queryKey: ['commodity-market-summary'] });
    },
  });
}

export function useUpdateCommodity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateCommodity(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commodities'] });
      queryClient.invalidateQueries({ queryKey: ['commodity-market-summary'] });
    },
  });
}

export function useUpdateCommodityPrice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateCommodityPrice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commodities'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-valuation'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-statistics'] });
    },
  });
}

export function useBatchUpdateCommodityPrices() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: batchUpdateCommodityPrices,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commodities'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-valuation'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-statistics'] });
    },
  });
}

export function useDeleteCommodity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteCommodity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commodities'] });
      queryClient.invalidateQueries({ queryKey: ['commodity-market-summary'] });
    },
  });
}