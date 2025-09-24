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
import { useDeleteCounterparty } from '@/lib/hooks/use-counterparties';
import { useToast } from '@/hooks/use-toast';

interface DeleteCounterpartyModalProps {
  counterpartyId: string;
  counterpartyName: string;
  disabled?: boolean;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DeleteCounterpartyModal({
  counterpartyId,
  counterpartyName,
  disabled,
  trigger,
  onSuccess,
  open: openProp,
  onOpenChange,
}: DeleteCounterpartyModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const mutation = useDeleteCounterparty();
  const { toast } = useToast();

  const isControlled = typeof openProp === 'boolean';
  const open = isControlled ? (openProp as boolean) : internalOpen;
  const setOpen = (value: boolean) => {
    if (!isControlled) {
      setInternalOpen(value);
    }
    onOpenChange?.(value);
  };

  const handleDelete = async () => {
    try {
      await mutation.mutateAsync(counterpartyId);
      toast({
        title: 'Counterparty deleted',
        description: `${counterpartyName} has been removed.`,
      });
      onSuccess?.();
      setOpen(false);
    } catch (error: any) {
      toast({
        title: 'Unable to delete counterparty',
        description: error?.message ?? 'Resolve active exposure before deleting.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" disabled={disabled}>
            Delete
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {counterpartyName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove the counterparty once all credit exposure and active contracts are cleared.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={mutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {mutation.isPending ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

