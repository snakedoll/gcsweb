-- AlterTable
ALTER TABLE "Order"
ADD COLUMN     "orderDateKey" TEXT,
ADD COLUMN     "orderSeq" INTEGER,
ADD COLUMN     "orderCode" TEXT;

-- CreateTable
CREATE TABLE "OrderSequence" (
    "orderDateKey" TEXT NOT NULL,
    "productType" INTEGER NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderSequence_pkey" PRIMARY KEY ("orderDateKey","productType")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderCode_key" ON "Order"("orderCode");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderDateKey_productType_orderSeq_key" ON "Order"("orderDateKey", "productType", "orderSeq");

-- CreateIndex
CREATE INDEX "Order_orderDateKey_productType_idx" ON "Order"("orderDateKey", "productType");
