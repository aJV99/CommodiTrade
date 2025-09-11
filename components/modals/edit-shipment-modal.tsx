'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateShipment } from '@/lib/hooks/use-shipments';
import { useTrades } from '@/lib/hooks/use-trades';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ShipmentEditModalProps {
  shipment: any;
  trigger?: React.ReactNode;
  onShipmentUpdated: () => void;
}

export function ShipmentEditModal({ shipment, trigger, onShipmentUpdated }: ShipmentEditModalProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    tradeId: shipment.trade?.id || '',
    quantity: shipment.quantity.toString(),
    origin: shipment.origin,
    destination: shipment.destination,
    carrier: shipment.carrier,
    trackingNumber: shipment.trackingNumber,
    departureDate: shipment.departureDate ? new Date(shipment.departureDate).toISOString().split('T')[0] : '',
    expectedArrival: shipment.expectedArrival ? new Date(shipment.expectedArrival).toISOString().split('T')[0] : '',
    actualArrival: shipment.actualArrival ? new Date(shipment.actualArrival).toISOString().split('T')[0] : '',
  });

  const updateShipmentMutation = useUpdateShipment();
  const { data: trades = [] } = useTrades();

  const handleTradeChange = (value: string) => {
    setFormData(prev => ({ ...prev, tradeId: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateShipmentMutation.mutateAsync({
        id: shipment.id,
        data: {
          tradeId: formData.tradeId || null,
          quantity: parseInt(formData.quantity),
          origin: formData.origin,
          destination: formData.destination,
          carrier: formData.carrier,
          trackingNumber: formData.trackingNumber,
          departureDate: formData.departureDate ? new Date(formData.departureDate) : undefined,
          expectedArrival: formData.expectedArrival ? new Date(formData.expectedArrival) : undefined,
          actualArrival: formData.actualArrival ? new Date(formData.actualArrival) : undefined,
        },
      });
      setOpen(false);
      onShipmentUpdated();
    } catch (err) {
      console.error('Error updating shipment:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="outline" size="sm">Edit</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Shipment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trade">Trade (optional)</Label>
            <Select value={formData.tradeId} onValueChange={handleTradeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select trade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No trade</SelectItem>
                {trades
                  .filter(t => t.commodity.id === shipment.commodity.id)
                  .map(trade => (
                    <SelectItem key={trade.id} value={trade.id}>
                      {trade.id} - {trade.commodity.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" type="number" value={formData.quantity} onChange={(e) => setFormData(prev => ({...prev, quantity: e.target.value}))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carrier">Carrier</Label>
              <Input id="carrier" value={formData.carrier} onChange={(e) => setFormData(prev => ({...prev, carrier: e.target.value}))} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="origin">Origin</Label>
              <Input id="origin" value={formData.origin} onChange={(e) => setFormData(prev => ({...prev, origin: e.target.value}))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination">Destination</Label>
              <Input id="destination" value={formData.destination} onChange={(e) => setFormData(prev => ({...prev, destination: e.target.value}))} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trackingNumber">Tracking Number</Label>
              <Input id="trackingNumber" value={formData.trackingNumber} onChange={(e) => setFormData(prev => ({...prev, trackingNumber: e.target.value}))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="departureDate">Departure Date</Label>
              <Input id="departureDate" type="date" value={formData.departureDate} onChange={(e) => setFormData(prev => ({...prev, departureDate: e.target.value}))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expectedArrival">Expected Arrival</Label>
              <Input id="expectedArrival" type="date" value={formData.expectedArrival} onChange={(e) => setFormData(prev => ({...prev, expectedArrival: e.target.value}))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actualArrival">Actual Arrival</Label>
              <Input id="actualArrival" type="date" value={formData.actualArrival} onChange={(e) => setFormData(prev => ({...prev, actualArrival: e.target.value}))} />
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={updateShipmentMutation.isPending}>{updateShipmentMutation.isPending ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
