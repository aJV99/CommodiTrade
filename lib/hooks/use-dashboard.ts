import { useQuery } from "@tanstack/react-query";
import {
  getDashboardStatistics,
  getTradingPerformance,
  getCommodityExposure,
  getSystemHealthMetrics,
} from "@/lib/database/dashboard";

export function useDashboardStatistics(userId?: string) {
  return useQuery({
    queryKey: ["dashboard-statistics", userId],
    queryFn: () => getDashboardStatistics(userId),
  });
}

export function useTradingPerformance(userId?: string, days: number = 30) {
  return useQuery({
    queryKey: ["trading-performance", userId, days],
    queryFn: () => getTradingPerformance(userId, days),
  });
}

export function useCommodityExposure(userId?: string) {
  return useQuery({
    queryKey: ["commodity-exposure", userId],
    queryFn: () => getCommodityExposure(userId),
  });
}

export function useSystemHealthMetrics() {
  return useQuery({
    queryKey: ["system-health-metrics"],
    queryFn: getSystemHealthMetrics,
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });
}
