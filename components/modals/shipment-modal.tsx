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
import { useCreateShipment } from "@/lib/hooks/use-shipments";
import { useCommodities } from "@/lib/hooks/use-commodities";
import { useTrades } from "@/lib/hooks/use-trades";

interface ShipmentModalProps {
  onShipmentCreated: () => void;
}

export function ShipmentModal({ onShipmentCreated }: ShipmentModalProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    tradeId: "",
    commodityId: "",
    quantity: "",
    origin: "",
    destination: "",
    carrier: "",
    trackingNumber: "",
    departureDate: "",
    expectedArrival: "",
  });

  const { data: commodities = [] } = useCommodities();
  const { data: trades = [] } = useTrades();
  const createShipmentMutation = useCreateShipment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createShipmentMutation.mutateAsync({
        tradeId: formData.tradeId || undefined,
        commodityId: formData.commodityId,
        quantity: parseInt(formData.quantity),
        origin: formData.origin,
        destination: formData.destination,
        carrier: formData.carrier,
        trackingNumber: formData.trackingNumber,
        departureDate: formData.departureDate
          ? new Date(formData.departureDate)
          : undefined,
        expectedArrival: new Date(formData.expectedArrival),
      });

      setOpen(false);
      setFormData({
        tradeId: "",
        commodityId: "",
        quantity: "",
        origin: "",
        destination: "",
        carrier: "",
        trackingNumber: "",
        departureDate: "",
        expectedArrival: "",
      });
      onShipmentCreated();
    } catch (error) {
      console.error("Error creating shipment:", error);
    }
  };

  const handleTradeChange = (value: string) => {
    if (value === "") {
      setFormData((prev) => ({ ...prev, tradeId: "", commodityId: "" }));
    } else {
      const trade = trades.find((t) => t.id === value);
      setFormData((prev) => ({
        ...prev,
        tradeId: value,
        commodityId: trade?.commodity.id || "",
      }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          New Shipment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Shipment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trade">Trade (optional)</Label>
            <Select value={formData.tradeId} onValueChange={handleTradeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select trade" />
              </SelectTrigger>
              <SelectContent>
                {/* <SelectItem value="No">No trade</SelectItem> */}
                {trades.map((trade) => (
                  <SelectItem key={trade.id} value={trade.id}>
                    {trade.id} - {trade.commodity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="commodity">Commodity</Label>
              <Select
                value={formData.commodityId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, commodityId: value }))
                }
                disabled={formData.tradeId !== ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select commodity" />
                </SelectTrigger>
                <SelectContent>
                  {commodities.map((commodity) => (
                    <SelectItem key={commodity.id} value={commodity.id}>
                      {commodity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="origin">Origin</Label>
              <Input
                id="origin"
                value={formData.origin}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, origin: e.target.value }))
                }
                placeholder="Origin location"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination">Destination</Label>
              <Input
                id="destination"
                value={formData.destination}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    destination: e.target.value,
                  }))
                }
                placeholder="Destination"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="carrier">Carrier</Label>
              <Input
                id="carrier"
                value={formData.carrier}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, carrier: e.target.value }))
                }
                placeholder="Shipping carrier"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trackingNumber">Tracking Number</Label>
              <Input
                id="trackingNumber"
                value={formData.trackingNumber}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    trackingNumber: e.target.value,
                  }))
                }
                placeholder="Tracking number"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="departureDate">Departure Date</Label>
              <Input
                id="departureDate"
                type="date"
                value={formData.departureDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    departureDate: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expectedArrival">Expected Arrival</Label>
              <Input
                id="expectedArrival"
                type="date"
                value={formData.expectedArrival}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    expectedArrival: e.target.value,
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
            <Button type="submit" disabled={createShipmentMutation.isPending}>
              {createShipmentMutation.isPending
                ? "Creating..."
                : "Create Shipment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
