export const INVENTORY_UNITS = [
  'MT',
  'BBL',
  'MWh',
  'LBS',
  'KG',
  'GAL',
] as const;

export const INVENTORY_QUALITIES = [
  'Grade A',
  'Grade 1',
  'Premium',
  'Standard',
  '99.9%',
] as const;

export type InventoryUnit = (typeof INVENTORY_UNITS)[number];
export type InventoryQuality = (typeof INVENTORY_QUALITIES)[number];

export function isInventoryUnit(value: string): value is InventoryUnit {
  return (INVENTORY_UNITS as readonly string[]).includes(value);
}

export function isInventoryQuality(value: string): value is InventoryQuality {
  return (INVENTORY_QUALITIES as readonly string[]).includes(value);
}
