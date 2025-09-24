"use server";
import { prisma } from "@/lib/prisma";
import { ContractType, ContractStatus } from "@prisma/client";

export interface CreateContractData {
  commodityId: string;
  counterpartyId: string;
  type: ContractType;
  quantity: number;
  price: number;
  startDate: Date;
  endDate: Date;
  deliveryTerms: string;
  paymentTerms: string;
}

export interface UpdateContractData {
  quantity?: number;
  price?: number;
  startDate?: Date;
  endDate?: Date;
  deliveryTerms?: string;
  paymentTerms?: string;
  status?: ContractStatus;
  executed?: number;
}

export interface ContractExecution {
  contractId: string;
  quantity: number;
  executionDate: Date;
  tradeId?: string;
  notes?: string;
}

// Create a new contract
export async function createContract(data: CreateContractData) {
  try {
    // Validate commodity exists
    const commodity = await prisma.commodity.findUnique({
      where: { id: data.commodityId },
    });

    if (!commodity) {
      throw new Error("Commodity not found");
    }

    // Validate counterparty exists
    const counterparty = await prisma.counterparty.findUnique({
      where: { id: data.counterpartyId },
    });

    if (!counterparty) {
      throw new Error("Counterparty not found");
    }

    // Calculate total value
    const totalValue = data.quantity * data.price;

    // Validate contract dates
    if (data.endDate <= data.startDate) {
      throw new Error("End date must be after start date");
    }

    const contract = await prisma.contract.create({
      data: {
        ...data,
        totalValue,
        remaining: data.quantity,
        status: ContractStatus.ACTIVE,
      },
      include: {
        commodity: true,
        counterparty: true,
      },
    });

    return contract;
  } catch (error) {
    console.error("Error creating contract:", error);
    throw error;
  }
}

// Get all contracts with filtering
export async function getContracts(filters?: {
  status?: ContractStatus;
  type?: ContractType;
  commodityId?: string;
  counterpartyId?: string;
  startDateFrom?: Date;
  startDateTo?: Date;
  endDateFrom?: Date;
  endDateTo?: Date;
  limit?: number;
  offset?: number;
}) {
  try {
    const where: any = {};

    if (filters?.status) where.status = filters.status;
    if (filters?.type) where.type = filters.type;
    if (filters?.commodityId) where.commodityId = filters.commodityId;
    if (filters?.counterpartyId) where.counterpartyId = filters.counterpartyId;

    if (filters?.startDateFrom || filters?.startDateTo) {
      where.startDate = {};
      if (filters.startDateFrom) where.startDate.gte = filters.startDateFrom;
      if (filters.startDateTo) where.startDate.lte = filters.startDateTo;
    }

    if (filters?.endDateFrom || filters?.endDateTo) {
      where.endDate = {};
      if (filters.endDateFrom) where.endDate.gte = filters.endDateFrom;
      if (filters.endDateTo) where.endDate.lte = filters.endDateTo;
    }

    const contracts = await prisma.contract.findMany({
      where,
      include: {
        commodity: true,
        counterparty: true,
      },
      orderBy: { createdAt: "desc" },
      take: filters?.limit || 100,
      skip: filters?.offset || 0,
    });

    return contracts;
  } catch (error) {
    console.error("Error fetching contracts:", error);
    throw error;
  }
}

// Get contract by ID
export async function getContractById(id: string) {
  try {
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        commodity: true,
        counterparty: true,
      },
    });

    if (!contract) {
      throw new Error("Contract not found");
    }

    return contract;
  } catch (error) {
    console.error("Error fetching contract:", error);
    throw error;
  }
}

// Update contract
export async function updateContract(id: string, data: UpdateContractData) {
  try {
    const existingContract = await prisma.contract.findUnique({
      where: { id },
    });

    if (!existingContract) {
      throw new Error("Contract not found");
    }

    // Calculate new total value if quantity or price changed
    let totalValue = existingContract.totalValue;
    let remaining = existingContract.remaining;

    if (data.quantity !== undefined || data.price !== undefined) {
      const newQuantity = data.quantity ?? existingContract.quantity;
      const newPrice = data.price ?? existingContract.price;
      totalValue = newQuantity * newPrice;

      // Adjust remaining quantity if total quantity changed
      if (data.quantity !== undefined) {
        const quantityDifference = data.quantity - existingContract.quantity;
        remaining = existingContract.remaining + quantityDifference;
      }
    }

    // Update remaining quantity if executed amount changed
    if (data.executed !== undefined) {
      remaining = (data.quantity ?? existingContract.quantity) - data.executed;
    }

    // Validate dates if provided
    if (data.startDate && data.endDate && data.endDate <= data.startDate) {
      throw new Error("End date must be after start date");
    }

    const updatedContract = await prisma.contract.update({
      where: { id },
      data: {
        ...data,
        totalValue,
        remaining: Math.max(0, remaining),
        updatedAt: new Date(),
      },
      include: {
        commodity: true,
        counterparty: true,
      },
    });

    return updatedContract;
  } catch (error) {
    console.error("Error updating contract:", error);
    throw error;
  }
}

// Execute part of a contract
export async function executeContract(execution: ContractExecution) {
  try {
    const contract = await prisma.contract.findUnique({
      where: { id: execution.contractId },
      include: {
        commodity: true,
        counterparty: true,
      },
    });

    if (!contract) {
      throw new Error("Contract not found");
    }

    if (contract.status !== ContractStatus.ACTIVE) {
      throw new Error("Only active contracts can be executed");
    }

    if (execution.quantity > contract.remaining) {
      throw new Error("Execution quantity exceeds remaining contract quantity");
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update contract execution
      const newExecuted = contract.executed + execution.quantity;
      const newRemaining = contract.remaining - execution.quantity;
      const newStatus =
        newRemaining === 0 ? ContractStatus.COMPLETED : ContractStatus.ACTIVE;

      const updatedContract = await tx.contract.update({
        where: { id: execution.contractId },
        data: {
          executed: newExecuted,
          remaining: newRemaining,
          status: newStatus,
          updatedAt: new Date(),
        },
        include: {
          commodity: true,
          counterparty: true,
        },
      });

      // Create corresponding trade if tradeId is provided
      if (execution.tradeId) {
        await tx.trade.update({
          where: { id: execution.tradeId },
          data: {
            status: "EXECUTED",
            updatedAt: new Date(),
          },
        });
      }

      // Handle inventory movements based on contract type
      if (contract.type === ContractType.PURCHASE) {
        // For purchase contracts, add to inventory when executed
        const existingInventory = await tx.inventoryItem.findFirst({
          where: {
            commodityId: contract.commodityId,
          },
        });

        if (existingInventory) {
          // Update existing inventory
          const newQuantity = existingInventory.quantity + execution.quantity;
          const newCostBasis =
            (existingInventory.quantity * existingInventory.costBasis +
              execution.quantity * contract.price) /
            newQuantity;

          await tx.inventoryItem.update({
            where: { id: existingInventory.id },
            data: {
              quantity: newQuantity,
              costBasis: newCostBasis,
              lastUpdated: new Date(),
            },
          });
        } else {
          // Create new inventory item
          await tx.inventoryItem.create({
            data: {
              commodityId: contract.commodityId,
              quantity: execution.quantity,
              unit: contract.commodity.unit,
              warehouse: "Contract Delivery", // Default warehouse for contract deliveries
              location: "Main Location",
              quality: "Contract Grade",
              costBasis: contract.price,
              marketValue: contract.commodity.currentPrice,
            },
          });
        }
      } else if (contract.type === ContractType.SALE) {
        // For sale contracts, reduce inventory when executed
        const inventoryItem = await tx.inventoryItem.findFirst({
          where: {
            commodityId: contract.commodityId,
            quantity: { gte: execution.quantity },
          },
        });

        if (inventoryItem) {
          await tx.inventoryItem.update({
            where: { id: inventoryItem.id },
            data: {
              quantity: inventoryItem.quantity - execution.quantity,
              lastUpdated: new Date(),
            },
          });
        } else {
          throw new Error("Insufficient inventory for contract execution");
        }
      }

      return updatedContract;
    });

    return result;
  } catch (error) {
    console.error("Error executing contract:", error);
    throw error;
  }
}

// Cancel contract
export async function cancelContract(id: string, reason?: string) {
  try {
    const contract = await prisma.contract.findUnique({
      where: { id },
    });

    if (!contract) {
      throw new Error("Contract not found");
    }

    if (contract.status === ContractStatus.COMPLETED) {
      throw new Error("Cannot cancel completed contract");
    }

    const cancelledContract = await prisma.contract.update({
      where: { id },
      data: {
        status: ContractStatus.CANCELLED,
        updatedAt: new Date(),
      },
      include: {
        commodity: true,
        counterparty: true,
      },
    });

    return cancelledContract;
  } catch (error) {
    console.error("Error cancelling contract:", error);
    throw error;
  }
}

// Get contracts expiring soon
export async function getExpiringContracts(daysAhead: number = 30) {
  try {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const expiringContracts = await prisma.contract.findMany({
      where: {
        status: ContractStatus.ACTIVE,
        endDate: {
          lte: futureDate,
          gte: new Date(),
        },
      },
      include: {
        commodity: true,
        counterparty: true,
      },
      orderBy: {
        endDate: "asc",
      },
    });

    return expiringContracts;
  } catch (error) {
    console.error("Error fetching expiring contracts:", error);
    throw error;
  }
}

// Get contract statistics
export async function getContractStatistics(filters?: {
  commodityId?: string;
  counterpartyId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  try {
    const where: any = {};

    if (filters?.commodityId) where.commodityId = filters.commodityId;
    if (filters?.counterpartyId) where.counterpartyId = filters.counterpartyId;
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    const [
      totalContracts,
      totalValue,
      activeContracts,
      completedContracts,
      cancelledContracts,
      totalExecuted,
      totalRemaining,
    ] = await Promise.all([
      prisma.contract.count({ where }),
      prisma.contract.aggregate({
        where,
        _sum: { totalValue: true },
      }),
      prisma.contract.count({
        where: { ...where, status: ContractStatus.ACTIVE },
      }),
      prisma.contract.count({
        where: { ...where, status: ContractStatus.COMPLETED },
      }),
      prisma.contract.count({
        where: { ...where, status: ContractStatus.CANCELLED },
      }),
      prisma.contract.aggregate({
        where,
        _sum: { executed: true },
      }),
      prisma.contract.aggregate({
        where,
        _sum: { remaining: true },
      }),
    ]);

    return {
      totalContracts,
      totalValue: totalValue._sum.totalValue || 0,
      activeContracts,
      completedContracts,
      cancelledContracts,
      totalExecuted: totalExecuted._sum.executed || 0,
      totalRemaining: totalRemaining._sum.remaining || 0,
      executionRate:
        totalExecuted._sum.executed && totalExecuted._sum.executed > 0
          ? (totalExecuted._sum.executed /
              (totalExecuted._sum.executed +
                (totalRemaining._sum.remaining || 0))) *
            100
          : 0,
    };
  } catch (error) {
    console.error("Error fetching contract statistics:", error);
    throw error;
  }
}
