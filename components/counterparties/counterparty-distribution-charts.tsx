"use client";

import React, { useMemo } from "react";
import {
  Pie,
  PieChart,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { CreditRating } from "@prisma/client";

const ratingPalette: Record<CreditRating | string, string> = {
  AAA: "#047857",
  AA: "#0f766e",
  A: "#2563eb",
  BBB: "#d97706",
  BB: "#f97316",
  B: "#dc2626",
};

const typePalette: Record<string, string> = {
  suppliers: "#2563eb",
  customers: "#059669",
  both: "#7c3aed",
};

interface RatingDistributionChartProps {
  ratingDistribution: Record<string, number>;
}

export function RatingDistributionChart({
  ratingDistribution,
}: RatingDistributionChartProps) {
  const data = useMemo(
    () =>
      Object.entries(ratingDistribution)
        .filter(([, value]) => value > 0)
        .map(([rating, value]) => ({ rating, value })),
    [ratingDistribution],
  );

  if (!data.length) {
    return (
      <div className="py-10 text-center text-sm text-slate-500">
        No rating data available.
      </div>
    );
  }

  return (
    <ChartContainer
      config={data.reduce(
        (acc, item) => {
          acc[item.rating] = {
            label: item.rating,
            color: ratingPalette[item.rating] ?? "#2563eb",
          };
          return acc;
        },
        {} as Record<string, { label: string; color: string }>,
      )}
      className="mx-auto h-[260px] w-full"
    >
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="rating"
          innerRadius={60}
          strokeWidth={6}
        >
          {data.map((entry) => (
            <Cell
              key={entry.rating}
              fill={ratingPalette[entry.rating] ?? "#2563eb"}
            />
          ))}
        </Pie>
        <ChartTooltip content={<ChartTooltipContent />} />
      </PieChart>
    </ChartContainer>
  );
}

interface TypeDistributionChartProps {
  typeDistribution: Record<string, number>;
}

export function TypeDistributionChart({
  typeDistribution,
}: TypeDistributionChartProps) {
  const data = useMemo(
    () =>
      Object.entries(typeDistribution).map(([type, value]) => ({
        type,
        label: type.charAt(0).toUpperCase() + type.slice(1),
        value,
      })),
    [typeDistribution],
  );

  if (!data.length) {
    return (
      <div className="py-10 text-center text-sm text-slate-500">
        No counterparty type data available.
      </div>
    );
  }

  return (
    <ChartContainer
      config={data.reduce(
        (acc, item) => {
          acc[item.type] = {
            label: item.label,
            color: typePalette[item.type] ?? "#2563eb",
          };
          return acc;
        },
        {} as Record<string, { label: string; color: string }>,
      )}
      className="h-[280px] w-full"
    >
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" stroke="#94a3b8" />
        <YAxis allowDecimals={false} stroke="#94a3b8" />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.type}
              fill={typePalette[entry.type] ?? "#2563eb"}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
