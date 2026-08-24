-- CreateTable
CREATE TABLE "Store" (
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "storeSlug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("storeId")
);

-- CreateTable
CREATE TABLE "OnsiteProductCategory" (
    "categoryId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "OnsiteProductCategory_pkey" PRIMARY KEY ("categoryId")
);

-- CreateTable
CREATE TABLE "OnsiteProductOption" (
    "optionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" VARCHAR(18) NOT NULL,
    "price" INTEGER NOT NULL,
    "initStock" INTEGER NOT NULL,
    "currentStock" INTEGER NOT NULL,

    CONSTRAINT "OnsiteProductOption_pkey" PRIMARY KEY ("optionId")
);

-- DropIndex (legacy unused OnsiteProduct shape being replaced below)
DROP INDEX IF EXISTS "OnsiteProduct_qrItemId_idx";
DROP INDEX IF EXISTS "OnsiteProduct_qrItemId_key";

-- AlterTable: replace legacy (unused) OnsiteProduct columns with the normalized shape.
-- Requires the table to be empty (it is unused in application code) since the new
-- productId/storeId columns are NOT NULL with no default.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "OnsiteProduct" LIMIT 1) THEN
    RAISE EXCEPTION 'OnsiteProduct is not empty; aborting migration that assumes the legacy table is unused. Back up and migrate data manually before retrying.';
  END IF;
END $$;

ALTER TABLE "OnsiteProduct" DROP CONSTRAINT "OnsiteProduct_pkey";
ALTER TABLE "OnsiteProduct"
    DROP COLUMN "id",
    DROP COLUMN "qrItemId",
    DROP COLUMN "option",
    DROP COLUMN "emoji",
    DROP COLUMN "stock",
    ADD COLUMN     "productId" TEXT NOT NULL,
    ADD COLUMN     "storeId" TEXT NOT NULL,
    ADD COLUMN     "categoryId" TEXT,
    ADD COLUMN     "hasOption" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN     "currentStock" INTEGER;
ALTER TABLE "OnsiteProduct" ALTER COLUMN "name" SET DATA TYPE VARCHAR(20);
ALTER TABLE "OnsiteProduct" ALTER COLUMN "price" DROP NOT NULL;
ALTER TABLE "OnsiteProduct" ALTER COLUMN "initStock" DROP NOT NULL;
ALTER TABLE "OnsiteProduct" ADD CONSTRAINT "OnsiteProduct_pkey" PRIMARY KEY ("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Store_storeSlug_key" ON "Store"("storeSlug");

-- CreateIndex
CREATE INDEX "OnsiteProductCategory_storeId_idx" ON "OnsiteProductCategory"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "OnsiteProductCategory_storeId_name_key" ON "OnsiteProductCategory"("storeId", "name");

-- CreateIndex
CREATE INDEX "OnsiteProductOption_productId_idx" ON "OnsiteProductOption"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "OnsiteProductOption_productId_name_key" ON "OnsiteProductOption"("productId", "name");

-- CreateIndex
CREATE INDEX "OnsiteProduct_storeId_idx" ON "OnsiteProduct"("storeId");

-- CreateIndex
CREATE INDEX "OnsiteProduct_categoryId_idx" ON "OnsiteProduct"("categoryId");

-- AddForeignKey
ALTER TABLE "OnsiteProductCategory" ADD CONSTRAINT "OnsiteProductCategory_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("storeId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnsiteProduct" ADD CONSTRAINT "OnsiteProduct_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("storeId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnsiteProduct" ADD CONSTRAINT "OnsiteProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "OnsiteProductCategory"("categoryId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnsiteProductOption" ADD CONSTRAINT "OnsiteProductOption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "OnsiteProduct"("productId") ON DELETE CASCADE ON UPDATE CASCADE;
