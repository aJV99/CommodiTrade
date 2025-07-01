import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getInventoryItems, 
  createInventoryItem, 
  updateInventoryItem, 
  deleteInventoryItem,
  processInventoryMovement,
  getInventoryValuation,
  getLowStockAlerts
} from '@/lib/database/inventory';

export function useInventory(filters?: {
  commodityId?: string;
  warehouse?: string;
  location?: string;
  quality?: string;
  minQuantity?: number;
  maxQuantity?: number;
}) {
  return useQuery({
    queryKey: ['inventory', filters],
    queryFn: () => getInventoryItems(filters),
  });
}

export function useInventoryValuation(filters?: {
  commodityId?: string;
  warehouse?: string;
  location?: string;
}) {
  return useQuery({
    queryKey: ['inventory-valuation', filters],
    queryFn: () => getInventoryValuation(filters),
  });
}

export function useLowStockAlerts(threshold: number = 100) {
  return useQuery({
    queryKey: ['low-stock-alerts', threshold],
    queryFn: () => getLowStockAlerts(threshold),
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createInventoryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-valuation'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
    },
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateInventoryItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-valuation'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-statistics'] });
    },
  });
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteInventoryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-valuation'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-statistics'] });
    },
  });
}

export function useProcessInventoryMovement() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: processInventoryMovement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-valuation'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-statistics'] });
    },
  });
}