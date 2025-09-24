-- CreateTable
CREATE TABLE "commodity_price_ticks" (
    "id" TEXT NOT NULL,
    "commodity_id" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "commodity_price_ticks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "commodity_price_ticks_commodity_recorded_idx" ON "commodity_price_ticks"("commodity_id", "recorded_at");

-- AddForeignKey
ALTER TABLE "commodity_price_ticks" ADD CONSTRAINT "commodity_price_ticks_commodity_id_fkey" FOREIGN KEY ("commodity_id") REFERENCES "commodities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
