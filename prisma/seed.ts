import { PrismaClient, ShipmentStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const commodity = await prisma.commodity.upsert({
    where: { name: 'Wheat' },
    update: {},
    create: {
      name: 'Wheat',
      type: 'AGRICULTURAL',
      unit: 'bushel',
      currentPrice: 5.5,
      priceChange: 0,
      priceChangePercent: 0,
    },
  })

  const shipment = await prisma.shipment.create({
    data: {
      commodityId: commodity.id,
      quantity: 100,
      origin: 'Kansas',
      destination: 'Chicago',
      status: ShipmentStatus.CANCELLED,
      expectedArrival: new Date(),
      carrier: 'Railways',
      trackingNumber: 'TRK123',
    },
  })

  await prisma.shipmentEvent.create({
    data: {
      shipmentId: shipment.id,
      status: ShipmentStatus.CANCELLED,
      notes: 'Order cancelled before departure',
      location: 'Kansas',
    },
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
