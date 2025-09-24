import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  processInventoryMovement,
  getInventoryValuation,
  getLowStockAlerts,
  getInventoryMovementsForItem,
} from '@/lib/database/inventory';
import type { InventoryMovementInput } from '@/lib/database/inventory';

export function useInventory(
  filters?: {
    commodityId?: string;
    warehouse?: string;
    location?: string;
    quality?: string;
    minQuantity?: number;
    maxQuantity?: number;
  },
  options?: {
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: ['inventory', filters],
    queryFn: () => getInventoryItems(filters),
    enabled: options?.enabled ?? true,
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

export function useInventoryMovements(
  inventoryId?: string,
  options?: { limit?: number },
) {
  return useQuery({
    queryKey: ['inventory-movements', inventoryId, options?.limit],
    queryFn: () =>
      getInventoryMovementsForItem(inventoryId as string, {
        limit: options?.limit,
      }),
    enabled: Boolean(inventoryId),
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
    mutationFn: (movement: InventoryMovementInput) =>
      processInventoryMovement(movement),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-valuation'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
    },
  });
}