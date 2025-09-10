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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useCreateCommodity, useUpdateCommodity } from '@/lib/hooks/use-commodities';
import { CommodityType } from '@prisma/client';

interface CommodityModalProps {
  onCommodityCreated?: () => void;
  onCommodityUpdated?: () => void;
  commodity?: {
    id: string;
    name: string;
    type: CommodityType;
    unit: string;
    currentPrice: number;
  };
  trigger?: React.ReactNode;
}

export function CommodityModal({
  onCommodityCreated,
  onCommodityUpdated,
  commodity,
  trigger,
}: CommodityModalProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: commodity?.name || '',
    type: (commodity?.type as CommodityType) || ('' as any),
    unit: commodity?.unit || '',
    currentPrice: commodity?.currentPrice?.toString() || '',
  });

  const createCommodityMutation = useCreateCommodity();
  const updateCommodityMutation = useUpdateCommodity();
  const isEdit = !!commodity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEdit && commodity) {
        await updateCommodityMutation.mutateAsync({
          id: commodity.id,
          data: {
            name: formData.name,
            type: formData.type as CommodityType,
            unit: formData.unit,
            currentPrice: parseFloat(formData.currentPrice),
          },
        });
        onCommodityUpdated && onCommodityUpdated();
      } else {
        await createCommodityMutation.mutateAsync({
          name: formData.name,
          type: formData.type as CommodityType,
          unit: formData.unit,
          currentPrice: parseFloat(formData.currentPrice),
        });
        setFormData({ name: '', type: '' as any, unit: '', currentPrice: '' });
        onCommodityCreated && onCommodityCreated();
      }
      setOpen(false);
    } catch (error) {
      console.error('Error saving commodity:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          <>{trigger}</>
        ) : (
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            New Commodity
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Commodity' : 'Add Commodity'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Commodity name"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: CommodityType) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AGRICULTURAL">Agricultural</SelectItem>
                  <SelectItem value="ENERGY">Energy</SelectItem>
                  <SelectItem value="METALS">Metals</SelectItem>
                  <SelectItem value="LIVESTOCK">Livestock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="e.g., BBL, MT"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="currentPrice">Current Price</Label>
            <Input
              id="currentPrice"
              type="number"
              step="0.01"
              value={formData.currentPrice}
              onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })}
              placeholder="Enter price"
              required
            />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isEdit ? updateCommodityMutation.isPending : createCommodityMutation.isPending}
            >
              {isEdit
                ? updateCommodityMutation.isPending
                  ? 'Saving...'
                  : 'Save Changes'
                : createCommodityMutation.isPending
                  ? 'Adding...'
                  : 'Add Commodity'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

