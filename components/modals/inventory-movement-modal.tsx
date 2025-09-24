'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useProcessInventoryMovement } from '@/lib/hooks/use-inventory';
import { useToast } from '@/hooks/use-toast';
import {
  InventoryMovementValues,
  inventoryMovementSchema,
  inventoryMovementReferenceTypes,
  inventoryMovementTypes,
} from '@/lib/validation/inventory';
import type { InventoryItem, Commodity } from '@prisma/client';

interface InventoryMovementModalProps {
  inventory: InventoryItem & { commodity: Commodity };
  trigger: React.ReactNode;
  onMovementProcessed?: () => void;
}

export function InventoryMovementModal({
  inventory,
  trigger,
  onMovementProcessed,
}: InventoryMovementModalProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const processMovementMutation = useProcessInventoryMovement();
  const form = useForm<InventoryMovementValues>({
    resolver: zodResolver(inventoryMovementSchema),
    defaultValues: {
      inventoryId: inventory.id,
      type: 'IN',
      quantity: 0,
      reason: '',
      referenceType: 'MANUAL',
      referenceId: '',
      unitCost: inventory.costBasis,
      unitMarketValue: inventory.marketValue,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        inventoryId: inventory.id,
        type: 'IN',
        quantity: 0,
        reason: '',
        referenceType: 'MANUAL',
        referenceId: '',
        unitCost: inventory.costBasis,
        unitMarketValue: inventory.marketValue,
      });
    }
  }, [inventory, form, open]);

  const movementType = form.watch('type');

  const onSubmit = async (values: InventoryMovementValues) => {
    try {
      await processMovementMutation.mutateAsync(values);
      toast({
        title: 'Movement posted',
        description: `${values.type} movement applied to ${inventory.commodity.name}.`,
      });
      onMovementProcessed?.();
      setOpen(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to process movement. Please try again.';

      toast({
        title: 'Movement failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const quantityLabel =
    movementType === 'ADJUSTMENT' ? 'New quantity on hand' : 'Quantity';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Post inventory movement</DialogTitle>
          <DialogDescription>
            Record receipts, draws, or adjustments to keep warehouse balances accurate.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Movement type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select movement" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {inventoryMovementTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{quantityLabel}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value === ''
                              ? undefined
                              : Number(event.target.value),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="referenceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select reference" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {inventoryMovementReferenceTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="referenceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference ID (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Link to trade, shipment, or ticket" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(movementType === 'IN' || movementType === 'ADJUSTMENT') && (
              <FormField
                control={form.control}
                name="unitCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit cost</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        {...field}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value === ''
                              ? undefined
                              : Number(event.target.value),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="unitMarketValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Market value per unit</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      {...field}
                      onChange={(event) =>
                        field.onChange(
                          event.target.value === ''
                            ? undefined
                            : Number(event.target.value),
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Explain why this movement is occurring" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={processMovementMutation.isPending}>
                {processMovementMutation.isPending ? 'Posting…' : 'Post movement'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
