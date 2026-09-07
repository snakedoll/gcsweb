-- Phase 3: relational reference from OrderItem to the new OnsiteProduct/
-- OnsiteProductOption tables. Both columns are nullable and additive only —
-- existing orders and the QR shop's current stock-decrement flow are
-- untouched. onDelete: SetNull so a future OnsiteProduct/Option deletion
-- never cascades into deleting order history.

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "onsiteOptionId" TEXT,
ADD COLUMN     "onsiteProductId" TEXT;

-- CreateIndex
CREATE INDEX "OrderItem_onsiteProductId_idx" ON "OrderItem"("onsiteProductId");

-- CreateIndex
CREATE INDEX "OrderItem_onsiteOptionId_idx" ON "OrderItem"("onsiteOptionId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_onsiteProductId_fkey" FOREIGN KEY ("onsiteProductId") REFERENCES "OnsiteProduct"("productId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_onsiteOptionId_fkey" FOREIGN KEY ("onsiteOptionId") REFERENCES "OnsiteProductOption"("optionId") ON DELETE SET NULL ON UPDATE CASCADE;
