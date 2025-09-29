import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ALL_SELECT_VALUE = "__all__";

const normalizeCandidate = (value: string) => value.trim().toLowerCase();

export function normalizeSelectValue<T extends string>(
  value: T | typeof ALL_SELECT_VALUE | null | undefined,
): T | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (value === ALL_SELECT_VALUE) {
    return undefined;
  }

  const normalized = normalizeCandidate(value);

  if (normalized.length === 0 || normalized === "all") {
    return undefined;
  }

  return value as T;
}

export function getAllSelectValue(value?: string | null) {
  const normalized = normalizeSelectValue<string>(value ?? undefined);

  if (!normalized) {
    return ALL_SELECT_VALUE;
  }

  return normalized;
}
