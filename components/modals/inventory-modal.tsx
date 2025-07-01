'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useCreateInventoryItem } from '@/lib/hooks/use-inventory';
import { useCommodities } from '@/lib/hooks/use-commodities';

interface InventoryModalProps {
  onInventoryCreated: () => void;
}

export function InventoryModal({ onInventoryCreated }: InventoryModalProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    commodityId: '',
    quantity: '',
    unit: '',
    warehouse: '',
    location: '',
    quality: '',
    costBasis: '',
    marketValue: '',
  });

  const { data: commodities = [] } = useCommodities();
  const createInventoryMutation = useCreateInventoryItem();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createInventoryMutation.mutateAsync({
        commodityId: formData.commodityId,
        quantity: parseInt(formData.quantity),
        unit: formData.unit,
        warehouse: formData.warehouse,
        location: formData.location,
        quality: formData.quality,
        costBasis: parseFloat(formData.costBasis),
        marketValue: parseFloat(formData.marketValue),
      });

      setOpen(false);
      setFormData({
        commodityId: '',
        quantity: '',
        unit: '',
        warehouse: '',
        location: '',
        quality: '',
        costBasis: '',
        marketValue: '',
      });
      onInventoryCreated();
    } catch (error) {
      console.error('Error creating inventory item:', error);
    }
  };

  const handleCommodityChange = (commodityId: string) => {
    const selectedCommodity = commodities.find(c => c.id === commodityId);
    setFormData(prev => ({
      ...prev,
      commodityId,
      unit: selectedCommodity?.unit || '',
      marketValue: selectedCommodity?.currentPrice.toString() || '',
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Stock
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Inventory Stock</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="commodity">Commodity</Label>
              <Select value={formData.commodityId} onValueChange={handleCommodityChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select commodity" />
                </SelectTrigger>
                <SelectContent>
                  {commodities.map((commodity) => (
                    <SelectItem key={commodity.id} value={commodity.id}>
                      {commodity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                placeholder="Enter quantity"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                placeholder="e.g., MT, BBL, OZ"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quality">Quality</Label>
              <Select value={formData.quality} onValueChange={(value) => setFormData(prev => ({ ...prev, quality: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select quality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Grade A">Grade A</SelectItem>
                  <SelectItem value="Grade 1">Grade 1</SelectItem>
                  <SelectItem value="Premium">Premium</SelectItem>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="99.9%">99.9%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="warehouse">Warehouse</Label>
              <Input
                id="warehouse"
                value={formData.warehouse}
                onChange={(e) => setFormData(prev => ({ ...prev, warehouse: e.target.value }))}
                placeholder="Warehouse name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="City/Region"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="costBasis">Cost Basis</Label>
              <Input
                id="costBasis"
                type="number"
                step="0.01"
                value={formData.costBasis}
                onChange={(e) => setFormData(prev => ({ ...prev, costBasis: e.target.value }))}
                placeholder="Cost per unit"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="marketValue">Market Value</Label>
              <Input
                id="marketValue"
                type="number"
                step="0.01"
                value={formData.marketValue}
                onChange={(e) => setFormData(prev => ({ ...prev, marketValue: e.target.value }))}
                placeholder="Current market price"
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createInventoryMutation.isPending}>
              {createInventoryMutation.isPending ? 'Adding...' : 'Add Stock'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}