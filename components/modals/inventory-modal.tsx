"use client";

import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Plus } from "lucide-react";
import { useCreateInventoryItem } from "@/lib/hooks/use-inventory";
import { useCommodities } from "@/lib/hooks/use-commodities";
import { useToast } from "@/hooks/use-toast";
import {
  inventoryCreateSchema,
  InventoryFormValues,
} from "@/lib/validation/inventory";
import {
  INVENTORY_QUALITIES,
  INVENTORY_UNITS,
  isInventoryUnit,
  InventoryUnit,
} from "@/lib/constants/inventory";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

interface InventoryModalProps {
  onInventoryCreated?: () => void;
}

const DEFAULT_UNIT: InventoryUnit = INVENTORY_UNITS[0];
const DEFAULT_QUALITY = INVENTORY_QUALITIES[3] ?? INVENTORY_QUALITIES[0];

export function InventoryModal({ onInventoryCreated }: InventoryModalProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { data: commodities = [] } = useCommodities();
  const createInventoryMutation = useCreateInventoryItem();

  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventoryCreateSchema),
    defaultValues: {
      commodityId: "",
      quantity: 0,
      unit: DEFAULT_UNIT,
      warehouse: "",
      location: "",
      quality: DEFAULT_QUALITY,
      costBasis: 0,
      marketValue: 0,
    },
  });

  const commodityOptions = useMemo(
    () =>
      commodities.map((commodity) => ({
        label: commodity.name,
        value: commodity.id,
      })),
    [commodities],
  );

  const handleClose = () => {
    setOpen(false);
    form.reset();
  };

  const handleCommodityChange = (commodityId: string) => {
    form.setValue("commodityId", commodityId);
    const selectedCommodity = commodities.find((c) => c.id === commodityId);
    if (selectedCommodity) {
      if (selectedCommodity.unit && isInventoryUnit(selectedCommodity.unit)) {
        form.setValue("unit", selectedCommodity.unit);
      }
      if (typeof selectedCommodity.currentPrice === "number") {
        form.setValue("marketValue", selectedCommodity.currentPrice);
        form.setValue("costBasis", selectedCommodity.currentPrice);
      }
    }
  };

  const onSubmit = async (values: InventoryFormValues) => {
    try {
      await createInventoryMutation.mutateAsync(values);
      toast({
        title: "Inventory updated",
        description: "Inventory lot added successfully.",
      });
      onInventoryCreated?.();
      handleClose();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to create inventory lot. Please try again.";

      toast({
        title: "Unable to add stock",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Stock
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add Inventory Stock</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="commodityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commodity</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        handleCommodityChange(value);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select commodity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {commodityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="warehouse"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warehouse</FormLabel>
                    <FormControl>
                      <Input placeholder="Warehouse name" {...field} />
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
                      <Input placeholder="City/Region" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createInventoryMutation.isPending}
              >
                {createInventoryMutation.isPending ? "Adding…" : "Add Stock"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
