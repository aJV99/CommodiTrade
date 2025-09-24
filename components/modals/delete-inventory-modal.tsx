'use client';

import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useDeleteInventoryItem } from '@/lib/hooks/use-inventory';
import type { InventoryItem, Commodity } from '@prisma/client';
import { useToast } from '@/hooks/use-toast';

interface DeleteInventoryModalProps {
  inventory: InventoryItem & { commodity: Commodity };
  trigger: React.ReactNode;
  onDeleted?: () => void;
}

export function DeleteInventoryModal({
  inventory,
  trigger,
  onDeleted,
}: DeleteInventoryModalProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const deleteInventoryMutation = useDeleteInventoryItem();

  const handleDelete = async () => {
    try {
      await deleteInventoryMutation.mutateAsync(inventory.id);
      toast({
        title: 'Inventory removed',
        description: `${inventory.commodity.name} at ${inventory.warehouse} has been removed.`,
      });
      onDeleted?.();
      setOpen(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to delete inventory lot. Please try again.';

      toast({
        title: 'Unable to remove lot',
        description: message,
        variant: 'destructive',
      });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove inventory lot</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the {inventory.commodity.name} lot located in
            {` ${inventory.warehouse}`} ({inventory.location}). This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteInventoryMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteInventoryMutation.isPending}
            className="bg-destructive hover:bg-destructive/90"
          >
            {deleteInventoryMutation.isPending ? 'Removing…' : 'Remove lot'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
