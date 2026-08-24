-- AlterTable: OnsiteProductCategory gains createdAt/updatedAt (category is created
-- at product-registration time, so audit timestamps are needed like other tables).
ALTER TABLE "OnsiteProductCategory"
    ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- updatedAt is Prisma-client-managed (like Store.updatedAt / OnsiteProduct.updatedAt),
-- so drop the temporary default used only to satisfy NOT NULL while backfilling.
ALTER TABLE "OnsiteProductCategory" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CHECK constraints: price/initStock/currentStock must be >= 0 when present.
-- Not representable in this Prisma version's schema syntax, enforced at the DB level here.
ALTER TABLE "OnsiteProduct" ADD CONSTRAINT "OnsiteProduct_price_nonnegative"
    CHECK ("price" IS NULL OR "price" >= 0);
ALTER TABLE "OnsiteProduct" ADD CONSTRAINT "OnsiteProduct_initStock_nonnegative"
    CHECK ("initStock" IS NULL OR "initStock" >= 0);
ALTER TABLE "OnsiteProduct" ADD CONSTRAINT "OnsiteProduct_currentStock_nonnegative"
    CHECK ("currentStock" IS NULL OR "currentStock" >= 0);

ALTER TABLE "OnsiteProductOption" ADD CONSTRAINT "OnsiteProductOption_price_nonnegative"
    CHECK ("price" >= 0);
ALTER TABLE "OnsiteProductOption" ADD CONSTRAINT "OnsiteProductOption_initStock_nonnegative"
    CHECK ("initStock" >= 0);
ALTER TABLE "OnsiteProductOption" ADD CONSTRAINT "OnsiteProductOption_currentStock_nonnegative"
    CHECK ("currentStock" >= 0);
