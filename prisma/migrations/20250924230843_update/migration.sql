/*
  Warnings:

  - You are about to drop the column `commodity_id` on the `commodity_price_ticks` table. All the data in the column will be lost.
  - You are about to drop the column `recorded_at` on the `commodity_price_ticks` table. All the data in the column will be lost.
  - Added the required column `commodityId` to the `commodity_price_ticks` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."commodity_price_ticks" DROP CONSTRAINT "commodity_price_ticks_commodity_id_fkey";

-- DropIndex
DROP INDEX "public"."commodity_price_ticks_commodity_recorded_idx";

-- AlterTable
ALTER TABLE "public"."commodity_price_ticks" DROP COLUMN "commodity_id",
DROP COLUMN "recorded_at",
ADD COLUMN     "commodityId" TEXT NOT NULL,
ADD COLUMN     "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "commodity_price_ticks_commodity_recorded_idx" ON "public"."commodity_price_ticks"("commodityId", "recordedAt");

-- AddForeignKey
ALTER TABLE "public"."commodity_price_ticks" ADD CONSTRAINT "commodity_price_ticks_commodityId_fkey" FOREIGN KEY ("commodityId") REFERENCES "public"."commodities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
