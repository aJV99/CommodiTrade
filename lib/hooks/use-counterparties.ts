import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getCounterparties, 
  createCounterparty, 
  updateCounterparty,
  deleteCounterparty,
  updateCreditAssessment,
  getCreditRiskCounterparties,
  getCounterpartyPerformance,
  getCounterpartyStatistics
} from '@/lib/database/counterparties';
import { CounterpartyType, CreditRating } from '@prisma/client';

export function useCounterparties(filters?: {
  type?: CounterpartyType;
  rating?: CreditRating;
  country?: string;
  minCreditLimit?: number;
  maxCreditLimit?: number;
  creditUtilizationMin?: number;
  creditUtilizationMax?: number;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['counterparties', filters],
    queryFn: () => getCounterparties(filters),
  });
}

export function useCreditRiskCounterparties(utilizationThreshold: number = 80) {
  return useQuery({
    queryKey: ['credit-risk-counterparties', utilizationThreshold],
    queryFn: () => getCreditRiskCounterparties(utilizationThreshold),
  });
}

export function useCounterpartyPerformance(id: string, dateFrom?: Date, dateTo?: Date) {
  return useQuery({
    queryKey: ['counterparty-performance', id, dateFrom, dateTo],
    queryFn: () => getCounterpartyPerformance(id, dateFrom, dateTo),
    enabled: !!id,
  });
}

export function useCounterpartyStatistics() {
  return useQuery({
    queryKey: ['counterparty-statistics'],
    queryFn: getCounterpartyStatistics,
  });
}

export function useCreateCounterparty() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createCounterparty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counterparties'] });
      queryClient.invalidateQueries({ queryKey: ['counterparty-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-statistics'] });
    },
  });
}

export function useUpdateCounterparty() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateCounterparty(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counterparties'] });
      queryClient.invalidateQueries({ queryKey: ['counterparty-statistics'] });
    },
  });
}

export function useDeleteCounterparty() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteCounterparty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counterparties'] });
      queryClient.invalidateQueries({ queryKey: ['counterparty-statistics'] });
    },
  });
}

export function useUpdateCreditAssessment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateCreditAssessment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counterparties'] });
      queryClient.invalidateQueries({ queryKey: ['credit-risk-counterparties'] });
    },
  });
}