"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useCreateTrade, useUpdateTrade } from "@/lib/hooks/use-trades";
import { useCommodities } from "@/lib/hooks/use-commodities";
import { useCounterparties } from "@/lib/hooks/use-counterparties";
import type { Commodity, Counterparty, Trade, TradeType } from "@prisma/client";
import { useToast } from "@/hooks/use-toast";

interface TradeFormState {
  commodityId: string;
  type: TradeType;
  quantity: string;
  price: string;
  counterpartyId: string;
  location: string;
  settlementDate: string;
}

type TradeWithRelations = Trade & {
  commodity: Commodity;
  counterparty: Counterparty;
};

interface TradeModalProps {
  mode?: "create" | "edit";
  trade?: TradeWithRelations | null;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  isLoading?: boolean;
}

const emptyForm: TradeFormState = {
  commodityId: "",
  type: "BUY",
  quantity: "",
  price: "",
  counterpartyId: "",
  location: "",
  settlementDate: "",
};

function formatDateForInput(value?: Date | string) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

export function TradeModal({
  mode = "create",
  trade,
  trigger,
  open,
  onOpenChange,
  onSuccess,
  isLoading = false,
}: TradeModalProps) {
  const isControlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const dialogOpen = isControlled ? open : internalOpen;

  const { toast } = useToast();
  const { data: commodities = [] } = useCommodities();
  const { data: counterparties = [] } = useCounterparties();
  const createTradeMutation = useCreateTrade();
  const updateTradeMutation = useUpdateTrade();

  const [formData, setFormData] = useState<TradeFormState>(() => {
    if (mode === "edit" && trade) {
      return {
        commodityId: trade.commodityId,
        type: trade.type,
        quantity: trade.quantity.toString(),
        price: trade.price.toString(),
        counterpartyId: trade.counterpartyId,
        location: trade.location,
        settlementDate: formatDateForInput(trade.settlementDate),
      };
    }

    return emptyForm;
  });

  useEffect(() => {
    if (mode === "edit" && trade) {
      setFormData({
        commodityId: trade.commodityId,
        type: trade.type,
        quantity: trade.quantity.toString(),
        price: trade.price.toString(),
        counterpartyId: trade.counterpartyId,
        location: trade.location,
        settlementDate: formatDateForInput(trade.settlementDate),
      });
    }
  }, [mode, trade]);

  useEffect(() => {
    if (!dialogOpen && mode === "create") {
      setFormData(emptyForm);
    }
  }, [dialogOpen, mode]);

  const selectedCommodity = useMemo(
    () => commodities.find((c) => c.id === formData.commodityId),
    [commodities, formData.commodityId],
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  const handleCommodityChange = (commodityId: string) => {
    const commodity = commodities.find((c) => c.id === commodityId);
    setFormData((prev) => ({
      ...prev,
      commodityId,
      price: commodity?.currentPrice.toString() ?? prev.price,
    }));
  };

  const isSubmitting =
    createTradeMutation.isPending || updateTradeMutation.isPending;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      if (mode === "create") {
        await createTradeMutation.mutateAsync({
          commodityId: formData.commodityId,
          type: formData.type,
          quantity: parseInt(formData.quantity, 10),
          price: parseFloat(formData.price),
          counterpartyId: formData.counterpartyId,
          settlementDate: new Date(formData.settlementDate),
          location: formData.location,
        });

        toast({
          title: "Trade created",
          description: "The trade has been captured successfully.",
        });
      } else if (trade) {
        await updateTradeMutation.mutateAsync({
          id: trade.id,
          data: {
            quantity: parseInt(formData.quantity, 10),
            price: parseFloat(formData.price),
            settlementDate: new Date(formData.settlementDate),
            location: formData.location,
          },
        });

        toast({
          title: "Trade updated",
          description: "Changes to the trade have been saved.",
        });
      }

      handleOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Trade form submission failed", error);
    }
  };

  const dialogTitle = mode === "create" ? "Create New Trade" : "Edit Trade";

  const renderTrigger = () => {
    if (trigger) {
      return <DialogTrigger asChild>{trigger}</DialogTrigger>;
    }

    if (mode === "create") {
      return (
        <DialogTrigger asChild>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            New Trade
          </Button>
        </DialogTrigger>
      );
    }

    return null;
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {renderTrigger()}
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        {mode === "edit" && isLoading && !trade ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Loading trade details…
          </div>
        ) : mode === "edit" && !trade ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            We couldn&apos;t find this trade.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="commodity">Commodity</Label>
                <Select
                  value={formData.commodityId}
                  onValueChange={handleCommodityChange}
                  disabled={mode === "edit"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select commodity" />
                  </SelectTrigger>
                  <SelectContent>
                    {commodities.map((commodity) => (
                      <SelectItem key={commodity.id} value={commodity.id}>
                        {commodity.name} (${commodity.currentPrice.toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: TradeType) =>
                    setFormData((prev) => ({ ...prev, type: value }))
                  }
                  disabled={mode === "edit"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUY">Buy</SelectItem>
                    <SelectItem value="SELL">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      quantity: e.target.value,
                    }))
                  }
                  placeholder="Enter quantity"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      price: e.target.value,
                    }))
                  }
                  placeholder="Enter price"
                  required
                />
                {mode === "create" && selectedCommodity && (
                  <p className="text-xs text-muted-foreground">
                    Market: ${selectedCommodity.currentPrice.toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="counterparty">Counterparty</Label>
              <Select
                value={formData.counterpartyId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, counterpartyId: value }))
                }
                disabled={mode === "edit"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select counterparty" />
                </SelectTrigger>
                <SelectContent>
                  {counterparties.map((counterparty) => (
                    <SelectItem key={counterparty.id} value={counterparty.id}>
                      {counterparty.name} ({counterparty.country})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  placeholder="Trading location"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settlementDate">Settlement Date</Label>
                <Input
                  id="settlementDate"
                  type="date"
                  value={formData.settlementDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      settlementDate: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? mode === "create"
                    ? "Creating…"
                    : "Saving…"
                  : mode === "create"
                    ? "Create Trade"
                    : "Save Changes"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
