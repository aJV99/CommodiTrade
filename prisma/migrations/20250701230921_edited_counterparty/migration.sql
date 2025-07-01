/*
  Warnings:

  - You are about to drop the column `counterparty` on the `trades` table. All the data in the column will be lost.
  - Added the required column `counterpartyId` to the `trades` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "trades" DROP COLUMN "counterparty",
ADD COLUMN     "counterpartyId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "counterparties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
