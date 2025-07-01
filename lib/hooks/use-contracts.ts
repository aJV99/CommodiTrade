import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getContracts, 
  createContract, 
  updateContract, 
  executeContract,
  cancelContract,
  getExpiringContracts,
  getContractStatistics
} from '@/lib/database/contracts';
import { ContractStatus, ContractType } from '@prisma/client';

export function useContracts(filters?: {
  status?: ContractStatus;
  type?: ContractType;
  commodityId?: string;
  counterpartyId?: string;
  startDateFrom?: Date;
  startDateTo?: Date;
  endDateFrom?: Date;
  endDateTo?: Date;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['contracts', filters],
    queryFn: () => getContracts(filters),
  });
}

export function useExpiringContracts(daysAhead: number = 30) {
  return useQuery({
    queryKey: ['expiring-contracts', daysAhead],
    queryFn: () => getExpiringContracts(daysAhead),
  });
}

export function useContractStatistics(filters?: {
  commodityId?: string;
  counterpartyId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  return useQuery({
    queryKey: ['contract-statistics', filters],
    queryFn: () => getContractStatistics(filters),
  });
}

export function useCreateContract() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['counterparties'] });
    },
  });
}

export function useUpdateContract() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateContract(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract-statistics'] });
    },
  });
}

export function useExecuteContract() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: executeContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-statistics'] });
    },
  });
}

export function useCancelContract() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => cancelContract(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract-statistics'] });
    },
  });
}