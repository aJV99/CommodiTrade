"use server";
// Central export file for all database operations
export * from './trades';
export * from './inventory';
export * from './contracts';
export * from './shipments';
export * from './counterparties';
export * from './commodities';
export * from './dashboard';

// Re-export Prisma client
export { prisma } from '@/lib/prisma';

// Database connection utilities
export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

export async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    console.log('Database disconnected successfully');
    return true;
  } catch (error) {
    console.error('Database disconnection failed:', error);
    return false;
  }
}

// Database health check
export async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy', timestamp: new Date() };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date() 
    };
  }
}

// Transaction wrapper utility
export async function withTransaction<T>(
  callback: (tx: any) => Promise<T>
): Promise<T> {
  try {
    return await prisma.$transaction(callback);
  } catch (error) {
    console.error('Transaction failed:', error);
    throw error;
  }
}