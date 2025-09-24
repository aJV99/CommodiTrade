"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUpdateInventoryItem } from "@/lib/hooks/use-inventory";
import { useToast } from "@/hooks/use-toast";
import {
  InventoryUpdateValues,
  inventoryUpdateSchema,
} from "@/lib/validation/inventory";
import {
  INVENTORY_QUALITIES,
  INVENTORY_UNITS,
  isInventoryQuality,
  isInventoryUnit,
} from "@/lib/constants/inventory";
import type { InventoryItem, Commodity } from "@prisma/client";

interface EditInventoryModalProps {
  inventory: InventoryItem & { commodity: Commodity };
  trigger: React.ReactNode;
  onUpdated?: () => void;
}

export function EditInventoryModal({
  inventory,
  trigger,
  onUpdated,
}: EditInventoryModalProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const updateInventoryMutation = useUpdateInventoryItem();

  const form = useForm<InventoryUpdateValues>({
    resolver: zodResolver(inventoryUpdateSchema),
    defaultValues: {
      quantity: inventory.quantity,
      unit: isInventoryUnit(inventory.unit)
        ? inventory.unit
        : INVENTORY_UNITS[0],
      warehouse: inventory.warehouse,
      location: inventory.location,
      quality: isInventoryQuality(inventory.quality)
        ? inventory.quality
        : INVENTORY_QUALITIES[0],
      costBasis: inventory.costBasis,
      marketValue: inventory.marketValue,
    },
  });

  const handleClose = () => {
    setOpen(false);
    form.reset({
      quantity: inventory.quantity,
      unit: isInventoryUnit(inventory.unit)
        ? inventory.unit
        : INVENTORY_UNITS[0],
      warehouse: inventory.warehouse,
      location: inventory.location,
      quality: isInventoryQuality(inventory.quality)
        ? inventory.quality
        : INVENTORY_QUALITIES[0],
      costBasis: inventory.costBasis,
      marketValue: inventory.marketValue,
    });
  };

  const onSubmit = async (values: InventoryUpdateValues) => {
    try {
      await updateInventoryMutation.mutateAsync({
        id: inventory.id,
        data: values,
      });

      toast({
        title: "Inventory updated",
        description: "Lot details have been updated.",
      });
      onUpdated?.();
      handleClose();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update inventory lot. Please try again.";

      toast({
        title: "Unable to update lot",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Edit Lot Details</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    value={`${inventory.quantity.toLocaleString()} ${inventory.unit}`}
                    readOnly
                    className="bg-muted text-muted-foreground"
                  />
                </FormControl>
                <FormDescription>
                  Adjust stock levels via the movement workflow.
                </FormDescription>
              </FormItem>
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INVENTORY_UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="warehouse"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warehouse</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quality</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select quality" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INVENTORY_QUALITIES.map((quality) => (
                          <SelectItem key={quality} value={quality}>
                            {quality}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="costBasis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Basis</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        {...field}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value === ""
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
            </div>

            <FormField
              control={form.control}
              name="marketValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Market Value</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      {...field}
                      onChange={(event) =>
                        field.onChange(
                          event.target.value === ""
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

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateInventoryMutation.isPending}
              >
                {updateInventoryMutation.isPending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
