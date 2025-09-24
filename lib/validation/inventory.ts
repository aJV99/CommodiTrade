import { z } from 'zod';
import { INVENTORY_QUALITIES, INVENTORY_UNITS } from '@/lib/constants/inventory';

export const inventoryMovementTypes = ['IN', 'OUT', 'ADJUSTMENT'] as const;
export const inventoryMovementReferenceTypes = ['TRADE', 'SHIPMENT', 'MANUAL'] as const;

const unitEnum = z.enum(INVENTORY_UNITS);
const qualityEnum = z.enum(INVENTORY_QUALITIES);

export const inventoryCreateSchema = z.object({
  commodityId: z.string().min(1, 'Commodity is required'),
  quantity: z.number().int().positive('Quantity must be greater than zero'),
  unit: unitEnum,
  warehouse: z.string().min(1, 'Warehouse is required'),
  location: z.string().min(1, 'Location is required'),
  quality: qualityEnum,
  costBasis: z.number().positive('Cost basis must be greater than zero'),
  marketValue: z.number().positive('Market value must be greater than zero'),
});

export const inventoryUpdateSchema = inventoryCreateSchema
  .omit({ commodityId: true })
  .partial()
  .extend({
    quantity: z
      .number()
      .int()
      .nonnegative('Quantity cannot be negative')
      .optional(),
  });

export const inventoryMovementSchema = z
  .object({
    inventoryId: z.string().min(1, 'Inventory lot is required'),
    type: z.enum(inventoryMovementTypes),
    quantity: z.number().int(),
    reason: z.string().min(1).optional(),
    referenceType: z.enum(inventoryMovementReferenceTypes).optional(),
    referenceId: z.string().min(1).optional(),
    unitCost: z.number().nonnegative().optional(),
    unitMarketValue: z.number().nonnegative().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === 'ADJUSTMENT') {
      if (value.quantity < 0) {
        ctx.addIssue({
          path: ['quantity'],
          code: z.ZodIssueCode.custom,
          message: 'Adjusted quantity cannot be negative',
        });
      }
    } else if (value.quantity <= 0) {
      ctx.addIssue({
        path: ['quantity'],
        code: z.ZodIssueCode.custom,
        message: 'Movement quantity must be greater than zero',
      });
    }
  });

export type InventoryFormValues = z.infer<typeof inventoryCreateSchema>;
export type InventoryUpdateValues = z.infer<typeof inventoryUpdateSchema>;
export type InventoryMovementValues = z.infer<typeof inventoryMovementSchema>;
