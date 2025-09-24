'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Save } from 'lucide-react';
import { CounterpartyType, CreditRating } from '@prisma/client';
import {
  useCreateCounterparty,
  useUpdateCounterparty,
} from '@/lib/hooks/use-counterparties';
import { useToast } from '@/hooks/use-toast';

const typeOptions: { label: string; value: CounterpartyType }[] = [
  { label: 'Supplier', value: CounterpartyType.SUPPLIER },
  { label: 'Customer', value: CounterpartyType.CUSTOMER },
  { label: 'Both', value: CounterpartyType.BOTH },
];

const ratingOptions: CreditRating[] = [
  CreditRating.AAA,
  CreditRating.AA,
  CreditRating.A,
  CreditRating.BBB,
  CreditRating.BB,
  CreditRating.B,
];

type CounterpartyFormValues = {
  name: string;
  type: CounterpartyType | '';
  country: string;
  creditLimit: string;
  rating: CreditRating | '';
  contactPerson: string;
  email: string;
  phone: string;
};

export interface CounterpartyModalProps {
  counterparty?: {
    id: string;
    name: string;
    type: CounterpartyType;
    country: string;
    creditLimit: number;
    rating: CreditRating;
    contactPerson: string;
    email: string;
    phone: string;
  } | null;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CounterpartyModal({
  counterparty,
  trigger,
  onSuccess,
  open: openProp,
  onOpenChange,
}: CounterpartyModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const createMutation = useCreateCounterparty();
  const updateMutation = useUpdateCounterparty();
  const { toast } = useToast();

  const isControlled = typeof openProp === 'boolean';
  const open = isControlled ? (openProp as boolean) : internalOpen;
  const setOpen = (value: boolean) => {
    if (!isControlled) {
      setInternalOpen(value);
    }
    onOpenChange?.(value);
  };

  const initialForm: CounterpartyFormValues = useMemo(
    () => ({
      name: counterparty?.name ?? '',
      type: counterparty?.type ?? '',
      country: counterparty?.country ?? '',
      creditLimit:
        counterparty?.creditLimit !== undefined
          ? counterparty.creditLimit.toString()
          : '',
      rating: counterparty?.rating ?? '',
      contactPerson: counterparty?.contactPerson ?? '',
      email: counterparty?.email ?? '',
      phone: counterparty?.phone ?? '',
    }),
    [counterparty]
  );
  const [formValues, setFormValues] = useState<CounterpartyFormValues>(initialForm);

  useEffect(() => {
    setFormValues(initialForm);
  }, [initialForm]);

  const isEdit = Boolean(counterparty);

  const handleChange = (field: keyof CounterpartyFormValues) =>
    (value: string) => {
      setFormValues(prev => ({ ...prev, [field]: value }));
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedCreditLimit = Number(formValues.creditLimit);

    if (Number.isNaN(parsedCreditLimit) || parsedCreditLimit <= 0) {
      toast({
        title: 'Invalid credit limit',
        description: 'Please provide a credit limit greater than zero.',
        variant: 'destructive',
      });
      return;
    }

    if (!formValues.type || !formValues.rating) {
      toast({
        title: 'Missing fields',
        description: 'Please select both a counterparty type and rating.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (isEdit && counterparty) {
        await updateMutation.mutateAsync({
          id: counterparty.id,
          data: {
            name: formValues.name,
            type: formValues.type,
            country: formValues.country,
            creditLimit: parsedCreditLimit,
            rating: formValues.rating,
            contactPerson: formValues.contactPerson,
            email: formValues.email,
            phone: formValues.phone,
          },
        });
        toast({
          title: 'Counterparty updated',
          description: `${formValues.name} was updated successfully.`,
        });
      } else {
        await createMutation.mutateAsync({
          name: formValues.name,
          type: formValues.type,
          country: formValues.country,
          creditLimit: parsedCreditLimit,
          rating: formValues.rating,
          contactPerson: formValues.contactPerson,
          email: formValues.email,
          phone: formValues.phone,
        });
        toast({
          title: 'Counterparty created',
          description: `${formValues.name} has been added to your network.`,
        });
      }

      onSuccess?.();
      setOpen(false);
    } catch (error: any) {
      toast({
        title: 'Unable to save counterparty',
        description: error?.message ?? 'Please try again later.',
        variant: 'destructive',
      });
    }
  };

  const saving = isEdit ? updateMutation.isPending : createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            Add Counterparty
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit counterparty' : 'Add counterparty'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the organization details to keep records current.'
              : 'Create a new trading partner and set their initial credit exposure.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="counterparty-name">Company name</Label>
              <Input
                id="counterparty-name"
                value={formValues.name}
                onChange={event => handleChange('name')(event.target.value)}
                placeholder="Acme Trading Co."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="counterparty-type">Type</Label>
              <Select
                value={formValues.type}
                onValueChange={value => handleChange('type')(value)}
              >
                <SelectTrigger id="counterparty-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="counterparty-country">Country</Label>
              <Input
                id="counterparty-country"
                value={formValues.country}
                onChange={event => handleChange('country')(event.target.value)}
                placeholder="United States"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="counterparty-rating">Rating</Label>
              <Select
                value={formValues.rating}
                onValueChange={value => handleChange('rating')(value)}
              >
                <SelectTrigger id="counterparty-rating">
                  <SelectValue placeholder="Select rating" />
                </SelectTrigger>
                <SelectContent>
                  {ratingOptions.map(option => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="counterparty-credit">Credit limit (USD)</Label>
              <Input
                id="counterparty-credit"
                type="number"
                min={0}
                step="0.01"
                value={formValues.creditLimit}
                onChange={event => handleChange('creditLimit')(event.target.value)}
                placeholder="2500000"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="counterparty-contact">Primary contact</Label>
              <Input
                id="counterparty-contact"
                value={formValues.contactPerson}
                onChange={event => handleChange('contactPerson')(event.target.value)}
                placeholder="Jane Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="counterparty-email">Email</Label>
              <Input
                id="counterparty-email"
                type="email"
                value={formValues.email}
                onChange={event => handleChange('email')(event.target.value)}
                placeholder="trading@acme.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="counterparty-phone">Phone</Label>
              <Input
                id="counterparty-phone"
                value={formValues.phone}
                onChange={event => handleChange('phone')(event.target.value)}
                placeholder="+1 555 123 4567"
                required
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create counterparty'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

