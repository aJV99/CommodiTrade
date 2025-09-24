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
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { ContractType } from "@prisma/client";
import { useCreateContract } from "@/lib/hooks/use-contracts";
import { useCommodities } from "@/lib/hooks/use-commodities";
import { useCounterparties } from "@/lib/hooks/use-counterparties";

interface ContractModalProps {
  onContractCreated?: () => void;
  trigger?: React.ReactNode;
}

type ContractFormState = {
  commodityId: string;
  counterpartyId: string;
  type: ContractType;
  quantity: string;
  price: string;
  startDate: string;
  endDate: string;
  deliveryTerms: string;
  paymentTerms: string;
};

const formatDateInput = (date: Date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return localDate.toISOString().split("T")[0];
};

const createDefaultFormState = (): ContractFormState => {
  const today = new Date();
  const defaultEnd = new Date(today);
  defaultEnd.setMonth(defaultEnd.getMonth() + 1);

  return {
    commodityId: "",
    counterpartyId: "",
    type: ContractType.PURCHASE,
    quantity: "",
    price: "",
    startDate: formatDateInput(today),
    endDate: formatDateInput(defaultEnd),
    deliveryTerms: "",
    paymentTerms: "",
  };
};

export function ContractModal({
  onContractCreated,
  trigger,
}: ContractModalProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<ContractFormState>(() =>
    createDefaultFormState(),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: commoditiesData = [] } = useCommodities();
  const { data: counterpartiesData = [] } = useCounterparties();
  const createContractMutation = useCreateContract();

  const commodities = (commoditiesData ?? []) as Array<{
    id: string;
    name: string;
    currentPrice?: number;
    unit?: string;
  }>;
  const counterparties = (counterpartiesData ?? []) as Array<{
    id: string;
    name: string;
    country?: string;
  }>;

  const resetForm = () => {
    setFormData(createDefaultFormState());
    setErrorMessage(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const quantity = Number(formData.quantity);
    const price = Number(formData.price);
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);

    if (!formData.commodityId) {
      setErrorMessage("Please select a commodity.");
      return;
    }

    if (!formData.counterpartyId) {
      setErrorMessage("Please select a counterparty.");
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setErrorMessage("Quantity must be a positive number.");
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      setErrorMessage("Price must be a positive number.");
      return;
    }

    if (!(formData.startDate && !Number.isNaN(startDate.getTime()))) {
      setErrorMessage("Please provide a valid start date.");
      return;
    }

    if (!(formData.endDate && !Number.isNaN(endDate.getTime()))) {
      setErrorMessage("Please provide a valid end date.");
      return;
    }

    if (endDate <= startDate) {
      setErrorMessage("End date must be after the start date.");
      return;
    }

    if (!formData.deliveryTerms.trim()) {
      setErrorMessage("Delivery terms are required.");
      return;
    }

    if (!formData.paymentTerms.trim()) {
      setErrorMessage("Payment terms are required.");
      return;
    }

    try {
      await createContractMutation.mutateAsync({
        commodityId: formData.commodityId,
        counterpartyId: formData.counterpartyId,
        type: formData.type,
        quantity,
        price,
        startDate,
        endDate,
        deliveryTerms: formData.deliveryTerms.trim(),
        paymentTerms: formData.paymentTerms.trim(),
      });

      setOpen(false);
      resetForm();
      onContractCreated?.();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to create contract. Please try again.";
      setErrorMessage(message);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetForm();
    }
  };

  const handleCommodityChange = (commodityId: string) => {
    const selectedCommodity = commodities.find(
      (commodity) => commodity.id === commodityId,
    );

    setFormData((prev) => ({
      ...prev,
      commodityId,
      price: selectedCommodity?.currentPrice
        ? selectedCommodity.currentPrice.toString()
        : prev.price,
    }));
  };

  const handleStartDateChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      startDate: value,
      endDate: prev.endDate < value ? value : prev.endDate,
    }));
  };

  const today = formatDateInput(new Date());

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ? (
          <>{trigger}</>
        ) : (
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            New Contract
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Create Contract</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="commodity">Commodity</Label>
              <Select
                value={formData.commodityId}
                onValueChange={handleCommodityChange}
              >
                <SelectTrigger id="commodity">
                  <SelectValue placeholder="Select commodity" />
                </SelectTrigger>
                <SelectContent>
                  {commodities.map((commodity) => (
                    <SelectItem key={commodity.id} value={commodity.id}>
                      {commodity.name}
                      {commodity.currentPrice !== undefined
                        ? ` ($${commodity.currentPrice.toFixed(2)})`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="counterparty">Counterparty</Label>
              <Select
                value={formData.counterpartyId}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    counterpartyId: value,
                  }))
                }
              >
                <SelectTrigger id="counterparty">
                  <SelectValue placeholder="Select counterparty" />
                </SelectTrigger>
                <SelectContent>
                  {counterparties.map((counterparty) => (
                    <SelectItem key={counterparty.id} value={counterparty.id}>
                      {counterparty.name}
                      {counterparty.country ? ` (${counterparty.country})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: ContractType) =>
                  setFormData((prev) => ({
                    ...prev,
                    type: value,
                  }))
                }
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PURCHASE">Purchase</SelectItem>
                  <SelectItem value="SALE">Sale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={formData.quantity}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    quantity: event.target.value,
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
                min={0}
                step="0.01"
                value={formData.price}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    price: event.target.value,
                  }))
                }
                placeholder="Enter price"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                min={today}
                value={formData.startDate}
                onChange={(event) => handleStartDateChange(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                min={formData.startDate || today}
                value={formData.endDate}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    endDate: event.target.value,
                  }))
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliveryTerms">Delivery Terms</Label>
            <Textarea
              id="deliveryTerms"
              value={formData.deliveryTerms}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  deliveryTerms: event.target.value,
                }))
              }
              placeholder="Specify delivery schedule, location, and logistics expectations"
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentTerms">Payment Terms</Label>
            <Textarea
              id="paymentTerms"
              value={formData.paymentTerms}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  paymentTerms: event.target.value,
                }))
              }
              placeholder="Outline payment schedule, currency, and invoicing requirements"
              rows={3}
              required
            />
          </div>

          {errorMessage ? (
            <p className="text-sm text-red-600">{errorMessage}</p>
          ) : null}

          <div className="flex justify-end space-x-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createContractMutation.isPending}>
              {createContractMutation.isPending
                ? "Creating..."
                : "Create Contract"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
