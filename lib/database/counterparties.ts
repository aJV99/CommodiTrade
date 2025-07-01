"use server";
import { prisma } from '@/lib/prisma';
import { CounterpartyType, CreditRating } from '@prisma/client';

export interface CreateCounterpartyData {
  name: string;
  type: CounterpartyType;
  country: string;
  creditLimit: number;
  rating: CreditRating;
  contactPerson: string;
  email: string;
  phone: string;
}

export interface UpdateCounterpartyData {
  name?: string;
  type?: CounterpartyType;
  country?: string;
  creditLimit?: number;
  rating?: CreditRating;
  contactPerson?: string;
  email?: string;
  phone?: string;
}

export interface CreditAssessment {
  counterpartyId: string;
  newRating: CreditRating;
  newCreditLimit: number;
  assessmentDate: Date;
  notes?: string;
}

// Create a new counterparty
export async function createCounterparty(data: CreateCounterpartyData) {
  try {
    // Check for duplicate name
    const existingCounterparty = await prisma.counterparty.findUnique({
      where: { name: data.name }
    });

    if (existingCounterparty) {
      throw new Error('Counterparty with this name already exists');
    }

    // Validate email format (basic validation)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new Error('Invalid email format');
    }

    const counterparty = await prisma.counterparty.create({
      data: {
        ...data,
        creditUsed: 0,
        totalTrades: 0,
        totalVolume: 0,
      }
    });

    return counterparty;
  } catch (error) {
    console.error('Error creating counterparty:', error);
    throw error;
  }
}

// Get all counterparties with filtering
export async function getCounterparties(filters?: {
  type?: CounterpartyType;
  rating?: CreditRating;
  country?: string;
  minCreditLimit?: number;
  maxCreditLimit?: number;
  creditUtilizationMin?: number;
  creditUtilizationMax?: number;
  limit?: number;
  offset?: number;
}) {
  try {
    const where: any = {};

    if (filters?.type) where.type = filters.type;
    if (filters?.rating) where.rating = filters.rating;
    if (filters?.country) where.country = { contains: filters.country, mode: 'insensitive' };
    
    if (filters?.minCreditLimit !== undefined || filters?.maxCreditLimit !== undefined) {
      where.creditLimit = {};
      if (filters.minCreditLimit !== undefined) where.creditLimit.gte = filters.minCreditLimit;
      if (filters.maxCreditLimit !== undefined) where.creditLimit.lte = filters.maxCreditLimit;
    }

    let counterparties = await prisma.counterparty.findMany({
      where,
      include: {
        contracts: {
          select: {
            id: true,
            status: true,
            totalValue: true,
          }
        },
        _count: {
          select: {
            contracts: true,
          }
        }
      },
      orderBy: { name: 'asc' },
      take: filters?.limit || 100,
      skip: filters?.offset || 0,
    });

    // Filter by credit utilization if specified
    if (filters?.creditUtilizationMin !== undefined || filters?.creditUtilizationMax !== undefined) {
      counterparties = counterparties.filter(cp => {
        const utilization = cp.creditLimit > 0 ? (cp.creditUsed / cp.creditLimit) * 100 : 0;
        
        if (filters.creditUtilizationMin !== undefined && utilization < filters.creditUtilizationMin) {
          return false;
        }
        if (filters.creditUtilizationMax !== undefined && utilization > filters.creditUtilizationMax) {
          return false;
        }
        
        return true;
      });
    }

    return counterparties;
  } catch (error) {
    console.error('Error fetching counterparties:', error);
    throw error;
  }
}

// Get counterparty by ID
export async function getCounterpartyById(id: string) {
  try {
    const counterparty = await prisma.counterparty.findUnique({
      where: { id },
      include: {
        contracts: {
          include: {
            commodity: true,
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            contracts: true,
          }
        }
      }
    });

    if (!counterparty) {
      throw new Error('Counterparty not found');
    }

    return counterparty;
  } catch (error) {
    console.error('Error fetching counterparty:', error);
    throw error;
  }
}

// Update counterparty
export async function updateCounterparty(id: string, data: UpdateCounterpartyData) {
  try {
    const existingCounterparty = await prisma.counterparty.findUnique({
      where: { id }
    });

    if (!existingCounterparty) {
      throw new Error('Counterparty not found');
    }

    // Check for duplicate name if name is being updated
    if (data.name && data.name !== existingCounterparty.name) {
      const duplicateCounterparty = await prisma.counterparty.findUnique({
        where: { name: data.name }
      });

      if (duplicateCounterparty) {
        throw new Error('Counterparty with this name already exists');
      }
    }

    // Validate email format if email is being updated
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        throw new Error('Invalid email format');
      }
    }

    const updatedCounterparty = await prisma.counterparty.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        contracts: {
          include: {
            commodity: true,
          }
        }
      }
    });

    return updatedCounterparty;
  } catch (error) {
    console.error('Error updating counterparty:', error);
    throw error;
  }
}

// Delete counterparty
export async function deleteCounterparty(id: string) {
  try {
    const counterparty = await prisma.counterparty.findUnique({
      where: { id },
      include: {
        contracts: true,
      }
    });

    if (!counterparty) {
      throw new Error('Counterparty not found');
    }

    // Check if counterparty has active contracts
    const activeContracts = counterparty.contracts.filter(c => c.status === 'ACTIVE');
    if (activeContracts.length > 0) {
      throw new Error('Cannot delete counterparty with active contracts');
    }

    // Check if counterparty has outstanding credit
    if (counterparty.creditUsed > 0) {
      throw new Error('Cannot delete counterparty with outstanding credit');
    }

    const deletedCounterparty = await prisma.counterparty.delete({
      where: { id }
    });

    return deletedCounterparty;
  } catch (error) {
    console.error('Error deleting counterparty:', error);
    throw error;
  }
}

// Update credit assessment
export async function updateCreditAssessment(assessment: CreditAssessment) {
  try {
    const counterparty = await prisma.counterparty.findUnique({
      where: { id: assessment.counterpartyId }
    });

    if (!counterparty) {
      throw new Error('Counterparty not found');
    }

    // Validate new credit limit against current usage
    if (assessment.newCreditLimit < counterparty.creditUsed) {
      throw new Error('New credit limit cannot be lower than current credit usage');
    }

    const updatedCounterparty = await prisma.counterparty.update({
      where: { id: assessment.counterpartyId },
      data: {
        rating: assessment.newRating,
        creditLimit: assessment.newCreditLimit,
        updatedAt: new Date(),
      },
      include: {
        contracts: true,
      }
    });

    return updatedCounterparty;
  } catch (error) {
    console.error('Error updating credit assessment:', error);
    throw error;
  }
}

// Get counterparties with credit risk
export async function getCreditRiskCounterparties(utilizationThreshold: number = 80) {
  try {
    const counterparties = await prisma.counterparty.findMany({
      where: {
        creditLimit: { gt: 0 }
      },
      include: {
        contracts: {
          where: { status: 'ACTIVE' },
          select: {
            totalValue: true,
            remaining: true,
          }
        }
      }
    });

    const riskCounterparties = counterparties.filter(cp => {
      const utilization = (cp.creditUsed / cp.creditLimit) * 100;
      return utilization >= utilizationThreshold;
    });

    return riskCounterparties.map(cp => ({
      ...cp,
      creditUtilization: (cp.creditUsed / cp.creditLimit) * 100,
      availableCredit: cp.creditLimit - cp.creditUsed,
    }));
  } catch (error) {
    console.error('Error fetching credit risk counterparties:', error);
    throw error;
  }
}

// Get counterparty trading performance
export async function getCounterpartyPerformance(id: string, dateFrom?: Date, dateTo?: Date) {
  try {
    const counterparty = await prisma.counterparty.findUnique({
      where: { id },
      include: {
        contracts: {
          where: {
            ...(dateFrom && { createdAt: { gte: dateFrom } }),
            ...(dateTo && { createdAt: { lte: dateTo } }),
          },
          include: {
            commodity: true,
          }
        }
      }
    });

    if (!counterparty) {
      throw new Error('Counterparty not found');
    }

    const contracts = counterparty.contracts;
    
    const performance = {
      totalContracts: contracts.length,
      totalValue: contracts.reduce((sum, c) => sum + c.totalValue, 0),
      activeContracts: contracts.filter(c => c.status === 'ACTIVE').length,
      completedContracts: contracts.filter(c => c.status === 'COMPLETED').length,
      cancelledContracts: contracts.filter(c => c.status === 'CANCELLED').length,
      totalExecuted: contracts.reduce((sum, c) => sum + c.executed, 0),
      totalRemaining: contracts.reduce((sum, c) => sum + c.remaining, 0),
      averageContractValue: contracts.length > 0 ? contracts.reduce((sum, c) => sum + c.totalValue, 0) / contracts.length : 0,
      executionRate: contracts.length > 0 ? 
        (contracts.reduce((sum, c) => sum + c.executed, 0) / 
         contracts.reduce((sum, c) => sum + c.quantity, 0)) * 100 : 0,
      completionRate: contracts.length > 0 ? 
        (contracts.filter(c => c.status === 'COMPLETED').length / contracts.length) * 100 : 0,
      commodityBreakdown: contracts.reduce((acc: any, contract) => {
        const commodityName = contract.commodity.name;
        if (!acc[commodityName]) {
          acc[commodityName] = {
            contracts: 0,
            totalValue: 0,
            totalQuantity: 0,
          };
        }
        acc[commodityName].contracts += 1;
        acc[commodityName].totalValue += contract.totalValue;
        acc[commodityName].totalQuantity += contract.quantity;
        return acc;
      }, {}),
    };

    return {
      counterparty,
      performance,
    };
  } catch (error) {
    console.error('Error fetching counterparty performance:', error);
    throw error;
  }
}

// Get counterparty statistics
export async function getCounterpartyStatistics() {
  try {
    const [
      totalCounterparties,
      totalCreditLimit,
      totalCreditUsed,
      supplierCount,
      customerCount,
      bothCount,
      ratingDistribution,
    ] = await Promise.all([
      prisma.counterparty.count(),
      prisma.counterparty.aggregate({
        _sum: { creditLimit: true }
      }),
      prisma.counterparty.aggregate({
        _sum: { creditUsed: true }
      }),
      prisma.counterparty.count({ where: { type: CounterpartyType.SUPPLIER } }),
      prisma.counterparty.count({ where: { type: CounterpartyType.CUSTOMER } }),
      prisma.counterparty.count({ where: { type: CounterpartyType.BOTH } }),
      prisma.counterparty.groupBy({
        by: ['rating'],
        _count: { rating: true }
      }),
    ]);

    return {
      totalCounterparties,
      totalCreditLimit: totalCreditLimit._sum.creditLimit || 0,
      totalCreditUsed: totalCreditUsed._sum.creditUsed || 0,
      creditUtilization: totalCreditLimit._sum.creditLimit && totalCreditLimit._sum.creditLimit > 0 
        ? ((totalCreditUsed._sum.creditUsed || 0) / totalCreditLimit._sum.creditLimit) * 100 
        : 0,
      availableCredit: (totalCreditLimit._sum.creditLimit || 0) - (totalCreditUsed._sum.creditUsed || 0),
      typeDistribution: {
        suppliers: supplierCount,
        customers: customerCount,
        both: bothCount,
      },
      ratingDistribution: ratingDistribution.reduce((acc: any, item) => {
        acc[item.rating] = item._count.rating;
        return acc;
      }, {}),
    };
  } catch (error) {
    console.error('Error fetching counterparty statistics:', error);
    throw error;
  }
}