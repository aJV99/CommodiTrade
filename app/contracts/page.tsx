import type { Prisma } from '@prisma/client';

import { ContractsPageClient } from './ContractsPageClient';
import { getContracts } from '@/lib/database/contracts';

type ContractWithRelations = Prisma.ContractGetPayload<{
  include: { commodity: true; counterparty: true };
}>;

export default async function ContractsPage() {
  let contracts: ContractWithRelations[] = [];
  let errorMessage: string | null = null;

  try {
    const result = await getContracts();
    contracts = (result ?? []) as ContractWithRelations[];
  } catch (error) {
    errorMessage = error instanceof Error
      ? error.message
      : 'An unexpected error occurred while loading contracts.';
  }

  return <ContractsPageClient contracts={contracts} errorMessage={errorMessage} />;
}
