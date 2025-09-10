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
import { Button } from '@/components/ui/button';
import { useDeleteCommodity } from '@/lib/hooks/use-commodities';

interface DeleteCommodityModalProps {
  commodityId: string;
  commodityName: string;
  onCommodityDeleted?: () => void;
  trigger?: React.ReactNode;
}

export function DeleteCommodityModal({
  commodityId,
  commodityName,
  onCommodityDeleted,
  trigger,
}: DeleteCommodityModalProps) {
  const [open, setOpen] = useState(false);
  const deleteMutation = useDeleteCommodity();

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(commodityId);
    onCommodityDeleted?.();
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger ? <>{trigger}</> : (
          <Button variant="destructive" size="sm">Delete</Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {commodityName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

