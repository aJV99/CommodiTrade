"use server";
import { prisma } from "@/lib/prisma";
import { ShipmentStatus, TradeType } from "@prisma/client";
import { processInventoryMovement } from "@/lib/database/inventory";

export interface CreateShipmentData {
  tradeId?: string;
  commodityId: string;
  quantity: number;
  origin: string;
  destination: string;
  carrier: string;
  trackingNumber: string;
  departureDate?: Date;
  expectedArrival: Date;
}

export interface UpdateShipmentData {
  tradeId?: string | null;
  quantity?: number;
  origin?: string;
  destination?: string;
  status?: ShipmentStatus;
  departureDate?: Date;
  expectedArrival?: Date;
  actualArrival?: Date;
  carrier?: string;
  trackingNumber?: string;
}

export interface ShipmentTracking {
  shipmentId: string;
  status: ShipmentStatus;
  location?: string;
  timestamp: Date;
  notes?: string;
}

export interface ShipmentEventData {
  status?: ShipmentStatus;
  location?: string;
  notes?: string;
}

async function ensureInventoryLotForShipment(
  commodityId: string,
  warehouse: string,
  location: string,
  unit: string,
  costBasis: number,
  marketValue: number,
) {
  const existingLot = await prisma.inventoryItem.findFirst({
    where: {
      commodityId,
      warehouse,
      location,
      quality: "Standard",
    },
  });

  if (existingLot) {
    return existingLot;
  }

  return prisma.inventoryItem.create({
    data: {
      commodityId,
      quantity: 0,
      unit,
      warehouse,
      location,
      quality: "Standard",
      costBasis,
      marketValue,
    },
  });
}

// Create a new shipment
export async function createShipment(data: CreateShipmentData) {
  try {
    // Validate commodity exists
    const commodity = await prisma.commodity.findUnique({
      where: { id: data.commodityId },
    });

    if (!commodity) {
      throw new Error("Commodity not found");
    }

    // Validate trade exists if provided
    if (data.tradeId) {
      const trade = await prisma.trade.findUnique({
        where: { id: data.tradeId },
      });

      if (!trade) {
        throw new Error("Trade not found");
      }

      // Validate shipment quantity doesn't exceed trade quantity
      const existingShipments = await prisma.shipment.findMany({
        where: { tradeId: data.tradeId },
      });

      const totalShippedQuantity = existingShipments.reduce(
        (sum, shipment) => sum + shipment.quantity,
        0,
      );

      if (totalShippedQuantity + data.quantity > trade.quantity) {
        throw new Error("Shipment quantity exceeds remaining trade quantity");
      }
    }

    // Check for duplicate tracking number
    const existingShipment = await prisma.shipment.findUnique({
      where: { trackingNumber: data.trackingNumber },
    });

    if (existingShipment) {
      throw new Error("Tracking number already exists");
    }

    const shipment = await prisma.shipment.create({
      data: {
        ...data,
        status: ShipmentStatus.PREPARING,
      },
      include: {
        trade: {
          include: {
            commodity: true,
            user: true,
          },
        },
        commodity: true,
        events: {
          orderBy: { timestamp: "desc" },
        },
      },
    });

    return shipment;
  } catch (error) {
    console.error("Error creating shipment:", error);
    throw error;
  }
}

// Get all shipments with filtering
export async function getShipments(filters?: {
  status?: ShipmentStatus;
  tradeId?: string;
  commodityId?: string;
  origin?: string;
  destination?: string;
  carrier?: string;
  departureDateFrom?: Date;
  departureDateTo?: Date;
  expectedArrivalFrom?: Date;
  expectedArrivalTo?: Date;
  limit?: number;
  offset?: number;
}) {
  try {
    const where: any = {};

    if (filters?.status) where.status = filters.status;
    if (filters?.tradeId) where.tradeId = filters.tradeId;
    if (filters?.commodityId) where.commodityId = filters.commodityId;
    if (filters?.origin)
      where.origin = { contains: filters.origin, mode: "insensitive" };
    if (filters?.destination)
      where.destination = {
        contains: filters.destination,
        mode: "insensitive",
      };
    if (filters?.carrier)
      where.carrier = { contains: filters.carrier, mode: "insensitive" };

    if (filters?.departureDateFrom || filters?.departureDateTo) {
      where.departureDate = {};
      if (filters.departureDateFrom)
        where.departureDate.gte = filters.departureDateFrom;
      if (filters.departureDateTo)
        where.departureDate.lte = filters.departureDateTo;
    }

    if (filters?.expectedArrivalFrom || filters?.expectedArrivalTo) {
      where.expectedArrival = {};
      if (filters.expectedArrivalFrom)
        where.expectedArrival.gte = filters.expectedArrivalFrom;
      if (filters.expectedArrivalTo)
        where.expectedArrival.lte = filters.expectedArrivalTo;
    }

    const shipments = await prisma.shipment.findMany({
      where,
      include: {
        trade: {
          include: {
            commodity: true,
            user: true,
          },
        },
        commodity: true,
      },
      orderBy: { createdAt: "desc" },
      take: filters?.limit || 100,
      skip: filters?.offset || 0,
    });

    return shipments;
  } catch (error) {
    console.error("Error fetching shipments:", error);
    throw error;
  }
}

// Get shipment by ID
export async function getShipmentById(id: string) {
  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: {
        trade: {
          include: {
            commodity: true,
            user: true,
          },
        },
        commodity: true,
        events: {
          orderBy: { timestamp: "desc" },
        },
      },
    });

    if (!shipment) {
      throw new Error("Shipment not found");
    }

    return shipment;
  } catch (error) {
    console.error("Error fetching shipment:", error);
    throw error;
  }
}

export async function addShipmentEvent(id: string, data: ShipmentEventData) {
  try {
    const shipment = await prisma.shipment.findUnique({ where: { id } });
    if (!shipment) {
      throw new Error("Shipment not found");
    }

    const event = await prisma.shipmentEvent.create({
      data: {
        shipmentId: id,
        status: data.status ?? shipment.status,
        location: data.location,
        notes: data.notes,
      },
    });

    if (data.status) {
      const updateData: any = { status: data.status, updatedAt: new Date() };
      if (data.status === ShipmentStatus.DELIVERED && !shipment.actualArrival) {
        updateData.actualArrival = new Date();
      }
      if (
        data.status === ShipmentStatus.IN_TRANSIT &&
        !shipment.departureDate
      ) {
        updateData.departureDate = new Date();
      }
      await prisma.shipment.update({ where: { id }, data: updateData });

      if (data.status === ShipmentStatus.DELIVERED) {
        const detailedShipment = await prisma.shipment.findUnique({
          where: { id },
          include: {
            trade: true,
            commodity: true,
          },
        });

        if (detailedShipment?.commodity) {
          const trade = detailedShipment.trade;
          const movementType = trade?.type === TradeType.SELL ? "OUT" : "IN";
          const warehouse =
            movementType === "OUT"
              ? detailedShipment.origin
              : detailedShipment.destination;
          const location = warehouse;

          const inventoryLot = await ensureInventoryLotForShipment(
            detailedShipment.commodityId,
            warehouse,
            location,
            detailedShipment.commodity.unit,
            trade?.price ?? detailedShipment.commodity.currentPrice,
            detailedShipment.commodity.currentPrice,
          );

          await processInventoryMovement({
            inventoryId: inventoryLot.id,
            type: movementType,
            quantity: detailedShipment.quantity,
            reason: `Shipment ${detailedShipment.trackingNumber} delivered`,
            referenceType: "SHIPMENT",
            referenceId: detailedShipment.id,
            unitCost:
              movementType === "IN"
                ? (trade?.price ?? detailedShipment.commodity.currentPrice)
                : undefined,
            unitMarketValue: detailedShipment.commodity.currentPrice,
          });
        }
      }
    }

    return event;
  } catch (error) {
    console.error("Error adding shipment event:", error);
    throw error;
  }
}

// Get shipment by tracking number
export async function getShipmentByTrackingNumber(trackingNumber: string) {
  try {
    const shipment = await prisma.shipment.findUnique({
      where: { trackingNumber },
      include: {
        trade: {
          include: {
            commodity: true,
            user: true,
          },
        },
        commodity: true,
      },
    });

    if (!shipment) {
      throw new Error("Shipment not found");
    }

    return shipment;
  } catch (error) {
    console.error("Error fetching shipment by tracking number:", error);
    throw error;
  }
}

// Update shipment
export async function updateShipment(id: string, data: UpdateShipmentData) {
  try {
    const existingShipment = await prisma.shipment.findUnique({
      where: { id },
    });

    if (!existingShipment) {
      throw new Error("Shipment not found");
    }

    // Validate trade if being updated
    if (data.tradeId !== undefined) {
      if (data.tradeId) {
        const trade = await prisma.trade.findUnique({
          where: { id: data.tradeId },
        });
        if (!trade) {
          throw new Error("Trade not found");
        }
        if (trade.commodityId !== existingShipment.commodityId) {
          throw new Error("Trade commodity does not match shipment commodity");
        }
        const otherShipments = await prisma.shipment.findMany({
          where: { tradeId: data.tradeId, NOT: { id } },
        });
        const totalQuantity = otherShipments.reduce(
          (sum, s) => sum + s.quantity,
          0,
        );
        const newQuantity = data.quantity ?? existingShipment.quantity;
        if (totalQuantity + newQuantity > trade.quantity) {
          throw new Error("Shipment quantity exceeds remaining trade quantity");
        }
      }
    }

    // Validate tracking number uniqueness if being updated
    if (
      data.trackingNumber &&
      data.trackingNumber !== existingShipment.trackingNumber
    ) {
      const duplicateShipment = await prisma.shipment.findUnique({
        where: { trackingNumber: data.trackingNumber },
      });

      if (duplicateShipment) {
        throw new Error("Tracking number already exists");
      }
    }

    const updatedShipment = await prisma.shipment.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        trade: {
          include: {
            commodity: true,
            user: true,
          },
        },
        commodity: true,
      },
    });

    return updatedShipment;
  } catch (error) {
    console.error("Error updating shipment:", error);
    throw error;
  }
}

// Update shipment status with tracking
export async function updateShipmentStatus(
  id: string,
  status: ShipmentStatus,
  location?: string,
  notes?: string,
) {
  try {
    await addShipmentEvent(id, { status, location, notes });
    return getShipmentById(id);
  } catch (error) {
    console.error("Error updating shipment status:", error);
    throw error;
  }
}

// Delete shipment
export async function deleteShipment(id: string) {
  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id },
    });

    if (!shipment) {
      throw new Error("Shipment not found");
    }

    // Only allow deletion of shipments that haven't departed
    if (shipment.status !== ShipmentStatus.PREPARING) {
      throw new Error("Cannot delete shipment that has already departed");
    }

    const deletedShipment = await prisma.shipment.delete({
      where: { id },
      include: {
        trade: {
          include: {
            commodity: true,
            user: true,
          },
        },
        commodity: true,
      },
    });

    return deletedShipment;
  } catch (error) {
    console.error("Error deleting shipment:", error);
    throw error;
  }
}

// Get delayed shipments
export async function getDelayedShipments() {
  try {
    const now = new Date();

    const delayedShipments = await prisma.shipment.findMany({
      where: {
        status: {
          in: [ShipmentStatus.IN_TRANSIT, ShipmentStatus.PREPARING],
        },
        expectedArrival: {
          lt: now,
        },
      },
      include: {
        trade: {
          include: {
            commodity: true,
            user: true,
          },
        },
        commodity: true,
      },
      orderBy: {
        expectedArrival: "asc",
      },
    });

    // Update status to DELAYED for shipments that are overdue
    const delayedIds = delayedShipments
      .filter((s) => s.status !== ShipmentStatus.DELAYED)
      .map((s) => s.id);

    if (delayedIds.length > 0) {
      await prisma.shipment.updateMany({
        where: {
          id: { in: delayedIds },
        },
        data: {
          status: ShipmentStatus.DELAYED,
          updatedAt: new Date(),
        },
      });
    }

    return delayedShipments;
  } catch (error) {
    console.error("Error fetching delayed shipments:", error);
    throw error;
  }
}

// Get shipments arriving soon
export async function getArrivingSoonShipments(daysAhead: number = 7) {
  try {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const arrivingShipments = await prisma.shipment.findMany({
      where: {
        status: ShipmentStatus.IN_TRANSIT,
        expectedArrival: {
          gte: new Date(),
          lte: futureDate,
        },
      },
      include: {
        trade: {
          include: {
            commodity: true,
            user: true,
          },
        },
        commodity: true,
      },
      orderBy: {
        expectedArrival: "asc",
      },
    });

    return arrivingShipments;
  } catch (error) {
    console.error("Error fetching arriving shipments:", error);
    throw error;
  }
}

// Get shipment statistics
export async function getShipmentStatistics(filters?: {
  tradeId?: string;
  commodityId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  try {
    const where: any = {};

    if (filters?.tradeId) where.tradeId = filters.tradeId;
    if (filters?.commodityId) where.commodityId = filters.commodityId;
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    const [
      totalShipments,
      totalQuantity,
      preparingShipments,
      inTransitShipments,
      deliveredShipments,
      delayedShipments,
    ] = await Promise.all([
      prisma.shipment.count({ where }),
      prisma.shipment.aggregate({
        where,
        _sum: { quantity: true },
      }),
      prisma.shipment.count({
        where: { ...where, status: ShipmentStatus.PREPARING },
      }),
      prisma.shipment.count({
        where: { ...where, status: ShipmentStatus.IN_TRANSIT },
      }),
      prisma.shipment.count({
        where: { ...where, status: ShipmentStatus.DELIVERED },
      }),
      prisma.shipment.count({
        where: { ...where, status: ShipmentStatus.DELAYED },
      }),
    ]);

    return {
      totalShipments,
      totalQuantity: totalQuantity._sum.quantity || 0,
      preparingShipments,
      inTransitShipments,
      deliveredShipments,
      delayedShipments,
      deliveryRate:
        totalShipments > 0 ? (deliveredShipments / totalShipments) * 100 : 0,
      delayRate:
        totalShipments > 0 ? (delayedShipments / totalShipments) * 100 : 0,
    };
  } catch (error) {
    console.error("Error fetching shipment statistics:", error);
    throw error;
  }
}
