-- AlterTable
ALTER TABLE "ProductVariant" DROP COLUMN "stock",
ADD COLUMN     "isSoldOut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "optionSignature" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "ProductVariant_productId_isSoldOut_idx" ON "ProductVariant"("productId", "isSoldOut");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productId_optionSignature_key" ON "ProductVariant"("productId", "optionSignature");
