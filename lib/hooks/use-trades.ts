import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  getTrades,
  createTrade,
  updateTrade,
  executeTrade,
  cancelTrade,
  getTradeStatistics,
  getTradeById,
  type UpdateTradeData,
} from "@/lib/database/trades";
import { TradeStatus, TradeType } from "@prisma/client";
import { useToast } from "@/hooks/use-toast";

type TradeListItem = (
  Awaited<ReturnType<typeof getTrades>> extends Array<infer Item> ? Item : never
) extends infer Base
  ? Base extends object
    ? Base
    : never
  : never;

type TradeDetail = Awaited<ReturnType<typeof getTradeById>>;

type TradesResult = TradeListItem[];
type TradeResult = TradeDetail;
type TradeStatisticsResult = Awaited<ReturnType<typeof getTradeStatistics>>;

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
  const { toast } = useToast();

  const query = useQuery<TradesResult, Error>({
    queryKey: ["trades", filters],
    queryFn: () => getTrades(filters),
  });

  useEffect(() => {
    if (query.isError && query.error) {
      toast({
        title: "Unable to load trades",
        description: query.error.message,
        variant: "destructive",
      });
    }
  }, [query.error, query.isError, toast]);

  return query;
}

export function useTradeById(
  id: string,
  options?: {
    enabled?: boolean;
  },
) {
  const { toast } = useToast();

  const query = useQuery<TradeResult, Error>({
    queryKey: ["trade", id],
    queryFn: () => getTradeById(id),
    enabled: options?.enabled ?? !!id,
  });

  useEffect(() => {
    if (query.isError && query.error) {
      toast({
        title: "Unable to load trade",
        description: query.error.message,
        variant: "destructive",
      });
    }
  }, [query.error, query.isError, toast]);

  return query;
}

export function useTradeStatistics(filters?: {
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  return useQuery<TradeStatisticsResult, Error>({
    queryKey: ["trade-statistics", filters],
    queryFn: () => getTradeStatistics(filters),
  });
}

export function useCreateTrade() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createTrade,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["trade-statistics"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-statistics"] });
      queryClient.invalidateQueries({ queryKey: ["counterparties"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Trade creation failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateTrade() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<
    Awaited<ReturnType<typeof updateTrade>>,
    Error,
    { id: string; data: UpdateTradeData }
  >({
    mutationFn: ({ id, data }) => updateTrade(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["trade", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["trade-statistics"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Trade update failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });
}

export function useExecuteTrade() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      warehouse,
      quality,
      location,
    }: {
      id: string;
      warehouse?: string;
      quality?: string;
      location?: string;
    }) => executeTrade({ id, warehouse, quality, location }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-statistics"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Trade execution failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });
}

export function useCancelTrade() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => cancelTrade(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["counterparties"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-statistics"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Trade cancellation failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });
}
