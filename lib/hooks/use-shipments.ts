import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getShipments,
  createShipment,
  updateShipment,
  updateShipmentStatus,
  addShipmentEvent,
  deleteShipment,
  getDelayedShipments,
  getArrivingSoonShipments,
  getShipmentStatistics,
  getShipmentById,
} from '@/lib/database/shipments';
import { ShipmentStatus } from '@prisma/client';

export function useShipments(filters?: {
  status?: ShipmentStatus;
  tradeId?: string;
  commodityId?: string;
  origin?: string;
  destination?: string;
  carrier?: string;
  departureDateFrom?: Date;
  departureDateTo?: Date;
  expectedArrivalFrom?: Date;
  expectedArrivalTo?: Date;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['shipments', filters],
    queryFn: () => getShipments(filters),
  });
}

export function useDelayedShipments() {
  return useQuery({
    queryKey: ['delayed-shipments'],
    queryFn: getDelayedShipments,
  });
}

export function useArrivingSoonShipments(daysAhead: number = 7) {
  return useQuery({
    queryKey: ['arriving-soon-shipments', daysAhead],
    queryFn: () => getArrivingSoonShipments(daysAhead),
  });
}

export function useShipmentStatistics(filters?: {
  tradeId?: string;
  commodityId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  return useQuery({
    queryKey: ['shipment-statistics', filters],
    queryFn: () => getShipmentStatistics(filters),
  });
}

export function useShipment(id: string) {
  return useQuery({
    queryKey: ['shipment', id],
    queryFn: () => getShipmentById(id),
  });
}

export function useCreateShipment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createShipment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['shipment-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-statistics'] });
    },
  });
}

export function useUpdateShipment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateShipment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['delayed-shipments'] });
      queryClient.invalidateQueries({ queryKey: ['arriving-soon-shipments'] });
    },
  });
}

export function useUpdateShipmentStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status, location, notes }: { 
      id: string; 
      status: ShipmentStatus; 
      location?: string; 
      notes?: string; 
    }) => updateShipmentStatus(id, status, location, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['delayed-shipments'] });
      queryClient.invalidateQueries({ queryKey: ['arriving-soon-shipments'] });
    },
  });
}

export function useAddShipmentEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status?: ShipmentStatus; location?: string; notes?: string } }) =>
      addShipmentEvent(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shipment', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
    },
  });
}

export function useDeleteShipment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteShipment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['shipment-statistics'] });
    },
  });
}