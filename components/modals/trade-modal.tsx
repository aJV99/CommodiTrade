"use client";

import React, { useState } from "react";
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
import { useCreateTrade } from "@/lib/hooks/use-trades";
import { useCommodities } from "@/lib/hooks/use-commodities";
import { useCounterparties } from "@/lib/hooks/use-counterparties";
import { TradeType } from "@prisma/client";

interface TradeModalProps {
  onTradeCreated: () => void;
}

export function TradeModal({ onTradeCreated }: TradeModalProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    commodityId: "",
    type: "BUY" as TradeType,
    quantity: "",
    price: "",
    counterpartyId: "",
    location: "",
    settlementDate: "",
  });

  const { data: commodities = [] } = useCommodities();
  const { data: counterparties = [] } = useCounterparties();
  const createTradeMutation = useCreateTrade();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createTradeMutation.mutateAsync({
        commodityId: formData.commodityId,
        type: formData.type,
        quantity: parseInt(formData.quantity),
        price: parseFloat(formData.price),
        counterpartyId: formData.counterpartyId,
        settlementDate: new Date(formData.settlementDate),
        location: formData.location,
      });

      setOpen(false);
      setFormData({
        commodityId: "",
        type: "BUY",
        quantity: "",
        price: "",
        counterpartyId: "",
        location: "",
        settlementDate: "",
      });
      onTradeCreated();
    } catch (error) {
      console.error("Error creating trade:", error);
    }
  };

  const handleCommodityChange = (commodityId: string) => {
    const selectedCommodity = commodities.find((c) => c.id === commodityId);
    setFormData((prev) => ({
      ...prev,
      commodityId,
      price: selectedCommodity?.currentPrice.toString() || "",
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          New Trade
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Trade</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="commodity">Commodity</Label>
              <Select
                value={formData.commodityId}
                onValueChange={handleCommodityChange}
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
                  setFormData((prev) => ({ ...prev, quantity: e.target.value }))
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
                  setFormData((prev) => ({ ...prev, price: e.target.value }))
                }
                placeholder="Enter price"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="counterparty">Counterparty</Label>
            <Select
              value={formData.counterpartyId}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, counterpartyId: value }))
              }
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
                  setFormData((prev) => ({ ...prev, location: e.target.value }))
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
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createTradeMutation.isPending}>
              {createTradeMutation.isPending ? "Creating..." : "Create Trade"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
