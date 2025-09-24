-- Guarded enum extension to keep this migration idempotent when the value already exists.
DO $$
BEGIN
    ALTER TYPE "ShipmentStatus" ADD VALUE 'CANCELLED';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create the shipment_events table only if it is missing so this migration plays nicely with prior history.
CREATE TABLE IF NOT EXISTS "shipment_events" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL,
    "notes" TEXT,
    "location" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shipment_events_pkey" PRIMARY KEY ("id")
);

-- Ensure the foreign key is present without erroring if it was created earlier.
DO $$
BEGIN
    ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;