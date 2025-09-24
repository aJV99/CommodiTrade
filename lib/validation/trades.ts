import { TradeStatus, TradeType } from "@prisma/client";
import { z } from "zod";

const positiveQuantitySchema = z
  .number()
  .finite("Quantity must be a finite number")
  .gt(0, "Quantity must be greater than zero");

const positivePriceSchema = z
  .number()
  .finite("Price must be a finite number")
  .gt(0, "Price must be greater than zero");

const settlementDateSchema = z
  .preprocess((value) => {
    if (typeof value === "string" || value instanceof Date) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }

    return value;
  }, z.date())
  .refine((date) => !Number.isNaN(date.getTime()), {
    message: "Settlement date must be a valid date",
  });

export const tradeCreateSchema = z.object({
  commodityId: z.string().min(1, "Commodity is required"),
  type: z.nativeEnum(TradeType),
  quantity: positiveQuantitySchema,
  price: positivePriceSchema,
  counterpartyId: z.string().min(1, "Counterparty is required"),
  settlementDate: settlementDateSchema,
  location: z.string().min(1, "Location is required"),
  userId: z.string().min(1).optional(),
});

export const tradeUpdateSchema = z
  .object({
    quantity: positiveQuantitySchema.optional(),
    price: positivePriceSchema.optional(),
    status: z.nativeEnum(TradeStatus).optional(),
    settlementDate: settlementDateSchema.optional(),
    location: z.string().min(1, "Location is required").optional(),
  })
  .refine(
    (values) => Object.values(values).some((value) => value !== undefined),
    {
      message: "At least one field must be provided to update a trade",
    },
  );

export type TradeCreateInput = z.infer<typeof tradeCreateSchema>;
export type TradeUpdateInput = z.infer<typeof tradeUpdateSchema>;
