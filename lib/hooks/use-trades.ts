import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTrades,
  createTrade,
  updateTrade,
  executeTrade,
  cancelTrade,
  getTradeStatistics,
  getTradeById,
} from "@/lib/database/trades";
import { TradeStatus, TradeType } from "@prisma/client";

export function useTrades(filters?: {
  status?: TradeStatus;
  type?: TradeType;
  commodityId?: string;
  counterpartyId?: string;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ["trades", filters],
    queryFn: () => getTrades(filters),
  });
}

export function useTradeById(id: string) {
  return useQuery({
    queryKey: ["trade", id],
    queryFn: () => getTradeById(id),
    enabled: !!id,
  });
}

export function useTradeStatistics(filters?: {
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  return useQuery({
    queryKey: ["trade-statistics", filters],
    queryFn: () => getTradeStatistics(filters),
  });
}

export function useCreateTrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTrade,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["trade-statistics"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-statistics"] });
      queryClient.invalidateQueries({ queryKey: ["counterparties"] });
    },
  });
}

export function useUpdateTrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateTrade(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["trade", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["trade-statistics"] });
    },
  });
}

export function useExecuteTrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: executeTrade,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-statistics"] });
    },
  });
}

export function useCancelTrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelTrade(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["counterparties"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-statistics"] });
    },
  });
}
