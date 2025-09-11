'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateCommodityPrice } from '@/lib/hooks/use-commodities';

interface UpdatePriceModalProps {
  commodityId: string;
  currentPrice: number;
  onPriceUpdated?: () => void;
  trigger?: React.ReactNode;
}

export function UpdatePriceModal({ commodityId, currentPrice, onPriceUpdated, trigger }: UpdatePriceModalProps) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(currentPrice.toString());
  const updatePriceMutation = useUpdateCommodityPrice();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updatePriceMutation.mutateAsync({ commodityId, newPrice: parseFloat(price) });
    onPriceUpdated?.();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? trigger : <Button variant="outline" size="sm">Update Price</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Update Price</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="price">New Price</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updatePriceMutation.isPending}>
              {updatePriceMutation.isPending ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

