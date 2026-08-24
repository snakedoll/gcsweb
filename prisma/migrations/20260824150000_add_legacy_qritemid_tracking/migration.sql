-- Temporary QR shop migration traceability columns. Drop once the item.json/
-- FairShopProductTable -> Store/OnsiteProduct/OnsiteProductOption migration is
-- verified complete.

-- AlterTable
ALTER TABLE "OnsiteProduct" ADD COLUMN     "legacyQrItemId" TEXT;

-- AlterTable
ALTER TABLE "OnsiteProductOption" ADD COLUMN     "legacyQrItemId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "OnsiteProduct_legacyQrItemId_key" ON "OnsiteProduct"("legacyQrItemId");

-- CreateIndex
CREATE UNIQUE INDEX "OnsiteProductOption_legacyQrItemId_key" ON "OnsiteProductOption"("legacyQrItemId");
