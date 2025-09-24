import React from "react";
import { notFound } from "next/navigation";
import {
  getCounterpartyById,
  getCounterpartyPerformance,
} from "@/lib/database/counterparties";
import { CounterpartyDetailClient } from "@/components/counterparties/counterparty-detail-client";

export default async function CounterpartyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const [counterparty, performanceResult] = await Promise.all([
      getCounterpartyById(id),
      getCounterpartyPerformance(id),
    ]);

    return (
      <CounterpartyDetailClient
        counterparty={counterparty}
        performance={performanceResult.performance}
      />
    );
  } catch (error) {
    notFound();
  }
}
