-- CreateEnum
CREATE TYPE "BuyerType" AS ENUM ('USER', 'GUEST');

-- AlterTable: Order
ALTER TABLE "Order"
ADD COLUMN "buyerType" "BuyerType",
ADD COLUMN "buyerGuestTokenHash" VARCHAR(128),
ALTER COLUMN "ordererName" DROP NOT NULL,
ALTER COLUMN "ordererPhone" DROP NOT NULL;

-- Backfill buyerType from existing user linkage
UPDATE "Order"
SET "buyerType" = CASE
  WHEN "userId" IS NULL THEN 'GUEST'::"BuyerType"
  ELSE 'USER'::"BuyerType"
END
WHERE "buyerType" IS NULL;

-- Enforce buyerType default + not null
ALTER TABLE "Order"
ALTER COLUMN "buyerType" SET NOT NULL;

-- AlterTable: OrderItem
ALTER TABLE "OrderItem"
ADD COLUMN "productType" INTEGER;

-- Backfill OrderItem.productType using Product.type snapshot at migration time
UPDATE "OrderItem" oi
SET "productType" = p."type"
FROM "Product" p
WHERE oi."productId" = p."id";

ALTER TABLE "OrderItem"
ALTER COLUMN "productType" SET NOT NULL;

-- Optional guard for known orderable product types
ALTER TABLE "OrderItem"
ADD CONSTRAINT "OrderItem_productType_check" CHECK ("productType" IN (0, 1));
