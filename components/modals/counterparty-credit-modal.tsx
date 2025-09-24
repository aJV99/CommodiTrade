"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldAlert } from "lucide-react";
import { CreditRating } from "@prisma/client";
import { useUpdateCreditAssessment } from "@/lib/hooks/use-counterparties";
import { useToast } from "@/hooks/use-toast";

interface CounterpartyCreditModalProps {
  counterparty: {
    id: string;
    name: string;
    rating: CreditRating;
    creditLimit: number;
    creditUsed: number;
  };
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const ratingOptions: CreditRating[] = [
  CreditRating.AAA,
  CreditRating.AA,
  CreditRating.A,
  CreditRating.BBB,
  CreditRating.BB,
  CreditRating.B,
];

export function CounterpartyCreditModal({
  counterparty,
  trigger,
  onSuccess,
  open: openProp,
  onOpenChange,
}: CounterpartyCreditModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [rating, setRating] = useState<CreditRating>(counterparty.rating);
  const [creditLimit, setCreditLimit] = useState<string>(
    counterparty.creditLimit.toString(),
  );
  const [notes, setNotes] = useState("");
  const mutation = useUpdateCreditAssessment();
  const { toast } = useToast();

  const isControlled = typeof openProp === "boolean";
  const open = isControlled ? (openProp as boolean) : internalOpen;
  const setOpen = (value: boolean) => {
    if (!isControlled) {
      setInternalOpen(value);
    }
    onOpenChange?.(value);
  };

  useEffect(() => {
    setRating(counterparty.rating);
    setCreditLimit(counterparty.creditLimit.toString());
  }, [counterparty]);

  const utilization = useMemo(() => {
    if (!counterparty.creditLimit) return 0;
    return (
      Math.round((counterparty.creditUsed / counterparty.creditLimit) * 1000) /
      10
    );
  }, [counterparty.creditLimit, counterparty.creditUsed]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedLimit = Number(creditLimit);

    if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
      toast({
        title: "Invalid credit limit",
        description: "Credit limit must be greater than zero.",
        variant: "destructive",
      });
      return;
    }

    if (parsedLimit < counterparty.creditUsed) {
      toast({
        title: "Credit limit too low",
        description: "New credit limit cannot be below current utilization.",
        variant: "destructive",
      });
      return;
    }

    try {
      await mutation.mutateAsync({
        counterpartyId: counterparty.id,
        newRating: rating,
        newCreditLimit: parsedLimit,
        assessmentDate: new Date(),
        notes: notes || undefined,
      });
      toast({
        title: "Credit profile updated",
        description: `${counterparty.name}'s credit assessment has been refreshed.`,
      });
      onSuccess?.();
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Unable to update credit profile",
        description: error?.message ?? "Please try again later.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <ShieldAlert className="mr-2 h-4 w-4" />
            Update credit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Credit assessment</DialogTitle>
          <DialogDescription>
            Recalibrate limits and ratings to reflect the counterparty&apos;s
            latest performance.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">
              {counterparty.name}
            </div>
            <div className="mt-1 grid gap-1 sm:grid-cols-3">
              <span>
                Current rating: <strong>{counterparty.rating}</strong>
              </span>
              <span>
                Limit:{" "}
                <strong>${counterparty.creditLimit.toLocaleString()}</strong>
              </span>
              <span>
                Used:{" "}
                <strong>
                  ${counterparty.creditUsed.toLocaleString()} ({utilization}% )
                </strong>
              </span>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="credit-rating">New rating</Label>
              <Select
                value={rating}
                onValueChange={(value) => setRating(value as CreditRating)}
              >
                <SelectTrigger id="credit-rating">
                  <SelectValue placeholder="Select rating" />
                </SelectTrigger>
                <SelectContent>
                  {ratingOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="credit-limit">New credit limit (USD)</Label>
              <Input
                id="credit-limit"
                type="number"
                min={0}
                step="0.01"
                value={creditLimit}
                onChange={(event) => setCreditLimit(event.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="credit-notes">Assessment notes</Label>
            <Textarea
              id="credit-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Highlight rationale, payment performance or committee decisions."
              rows={4}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Updating…" : "Save assessment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
