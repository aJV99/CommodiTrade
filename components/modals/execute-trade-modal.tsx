"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Package,
  Warehouse,
  MapPin,
  CheckCircle,
  AlertCircle,
  Info,
} from "lucide-react";
import { useInventory } from "@/lib/hooks/use-inventory";
import { useExecuteTrade } from "@/lib/hooks/use-trades";
import { useToast } from "@/hooks/use-toast";
import type { Commodity, Counterparty, Trade } from "@prisma/client";

type TradeWithRelations = Trade & {
  commodity: Commodity;
  counterparty: Counterparty;
};

interface ExecuteTradeModalProps {
  trade: TradeWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ExecuteFormState {
  warehouse: string;
  location: string;
  quality: string;
}

export function ExecuteTradeModal({
  trade,
  open,
  onOpenChange,
  onSuccess,
}: ExecuteTradeModalProps) {
  const { toast } = useToast();
  const executeTradeMutation = useExecuteTrade();

  // Only fetch inventory for SELL trades
  const { data: inventoryItems = [] } = useInventory(
    trade.type === "SELL" ? { commodityId: trade.commodityId } : undefined,
    { enabled: open && trade.type === "SELL" },
  );

  const [formState, setFormState] = useState<ExecuteFormState>({
    warehouse: trade.location || "Main Warehouse",
    location: trade.location || "Main Warehouse",
    quality: "Standard",
  });

  // Extract unique options from inventory
  const { availableWarehouses, availableLocations, availableQualities } =
    useMemo(() => {
      if (trade.type === "BUY") {
        // For BUY trades, allow any warehouse/location
        return {
          availableWarehouses: [
            "Main Warehouse",
            "Secondary Warehouse",
            "Cold Storage",
          ],
          availableLocations: [
            "Main Warehouse",
            "Secondary Warehouse",
            "Cold Storage",
            "Loading Dock",
            "Storage Area A",
          ],
          availableQualities: ["Standard", "Premium", "Grade A", "Grade B"],
        };
      }

      // For SELL trades, get options from available inventory
      const warehouses = [
        ...new Set(inventoryItems.map((item) => item.warehouse)),
      ];
      const locations = [
        ...new Set(inventoryItems.map((item) => item.location)),
      ];
      const qualities = [
        ...new Set(inventoryItems.map((item) => item.quality)),
      ];

      return {
        availableWarehouses:
          warehouses.length > 0 ? warehouses : ["Main Warehouse"],
        availableLocations:
          locations.length > 0 ? locations : ["Main Warehouse"],
        availableQualities: qualities.length > 0 ? qualities : ["Standard"],
      };
    }, [inventoryItems, trade.type]);

  // For SELL trades, check available inventory for selected criteria
  const availableInventoryForSelection = useMemo(() => {
    if (trade.type === "BUY") return [];

    return inventoryItems.filter((item) => {
      const matchesWarehouse =
        !formState.warehouse || item.warehouse === formState.warehouse;
      const matchesLocation =
        !formState.location || item.location === formState.location;
      const matchesQuality =
        !formState.quality || item.quality === formState.quality;

      return (
        matchesWarehouse &&
        matchesLocation &&
        matchesQuality &&
        item.quantity > 0
      );
    });
  }, [inventoryItems, formState, trade.type]);

  const totalAvailableQuantity = useMemo(() => {
    return availableInventoryForSelection.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
  }, [availableInventoryForSelection]);

  const hasSufficientInventory =
    trade.type === "BUY" || totalAvailableQuantity >= trade.quantity;

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setFormState({
        warehouse: trade.location || "Main Warehouse",
        location: trade.location || "Main Warehouse",
        quality: "Standard",
      });
    }
  }, [open, trade.location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (trade.type === "SELL" && !hasSufficientInventory) {
      toast({
        title: "Insufficient inventory",
        description: `Need ${trade.quantity} ${trade.commodity.unit}, but only ${totalAvailableQuantity} available with selected criteria.`,
        variant: "destructive",
      });
      return;
    }

    try {
      await executeTradeMutation.mutateAsync({
        id: trade.id,
        warehouse: formState.warehouse,
        location: formState.location,
        quality: formState.quality,
      });

      toast({
        title: "Trade executed successfully",
        description: `Inventory has been ${trade.type === "BUY" ? "added to" : "taken from"} ${formState.warehouse} (${formState.location}).`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to execute trade:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Execute Trade
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Trade Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Trade Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Action:</span>
                <Badge variant={trade.type === "BUY" ? "default" : "secondary"}>
                  {trade.type} {trade.quantity.toLocaleString()}{" "}
                  {trade.commodity.unit}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Commodity:</span>
                <span className="font-medium">{trade.commodity.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Price:</span>
                <span className="font-medium">
                  ${trade.price.toFixed(2)} per {trade.commodity.unit}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-4 w-4" />
                {trade.type === "BUY" ? "Destination" : "Source"} Selection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Warehouse className="h-3 w-3" />
                    Warehouse
                  </Label>
                  <Select
                    value={formState.warehouse}
                    onValueChange={(value) =>
                      setFormState((prev) => ({ ...prev, warehouse: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableWarehouses.map((warehouse) => (
                        <SelectItem key={warehouse} value={warehouse}>
                          {warehouse}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    Location
                  </Label>
                  <Select
                    value={formState.location}
                    onValueChange={(value) =>
                      setFormState((prev) => ({ ...prev, location: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLocations.map((location) => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Quality</Label>
                  <Select
                    value={formState.quality}
                    onValueChange={(value) =>
                      setFormState((prev) => ({ ...prev, quality: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select quality" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableQualities.map((quality) => (
                        <SelectItem key={quality} value={quality}>
                          {quality}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Status for SELL trades */}
          {trade.type === "SELL" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Inventory Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Required:</span>
                  <span className="font-medium">
                    {trade.quantity.toLocaleString()} {trade.commodity.unit}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Available:</span>
                  <span
                    className={`font-medium ${hasSufficientInventory ? "text-green-600" : "text-red-600"}`}
                  >
                    {totalAvailableQuantity.toLocaleString()}{" "}
                    {trade.commodity.unit}
                  </span>
                </div>
                {!hasSufficientInventory && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">
                      Insufficient inventory with selected criteria. Try
                      selecting different warehouse/location options or adjust
                      the trade quantity.
                    </span>
                  </div>
                )}

                {availableInventoryForSelection.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">
                        Available lots:
                      </span>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {availableInventoryForSelection.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded"
                          >
                            <span className="text-slate-600">
                              {item.warehouse} - {item.location} ({item.quality}
                              )
                            </span>
                            <span className="font-medium">
                              {item.quantity.toLocaleString()}{" "}
                              {trade.commodity.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                executeTradeMutation.isPending ||
                (trade.type === "SELL" && !hasSufficientInventory)
              }
            >
              {executeTradeMutation.isPending
                ? "Executing..."
                : "Execute Trade"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
