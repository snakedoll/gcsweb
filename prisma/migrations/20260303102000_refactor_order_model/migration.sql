-- 1) userId optional + FK onDelete SET NULL
ALTER TABLE "Order"
ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "Order"
DROP CONSTRAINT IF EXISTS "Order_userId_fkey";

ALTER TABLE "Order"
ADD CONSTRAINT "Order_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- 2) rename amount column
ALTER TABLE "Order"
RENAME COLUMN "totalAmount" TO "paymentAmount";

-- 3) add new columns (nullable first for safe backfill)
ALTER TABLE "Order"
ADD COLUMN "productType" INTEGER,
ADD COLUMN "receiveMethod" INTEGER,
ADD COLUMN "receiverName" TEXT,
ADD COLUMN "receiverPhone" TEXT,
ADD COLUMN "deliveryZipCode" TEXT,
ADD COLUMN "deliveryAddressMain" TEXT,
ADD COLUMN "deliveryAddressDetail" TEXT,
ADD COLUMN "deliveryMessage" TEXT,
ADD COLUMN "ordererName" TEXT,
ADD COLUMN "ordererPhone" TEXT,
ADD COLUMN "paymentStatus" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "fulfillmentStatus" INTEGER;

-- 4) backfill data
UPDATE "Order" o
SET
  "productType" = COALESCE((
    SELECT p."type"
    FROM "OrderItem" oi
    JOIN "Product" p ON p."id" = oi."productId"
    WHERE oi."orderId" = o."id"
    ORDER BY oi."createdAt" ASC
    LIMIT 1
  ), 1),
  "receiveMethod" = COALESCE((
    SELECT p."receiveMethod"
    FROM "OrderItem" oi
    JOIN "Product" p ON p."id" = oi."productId"
    WHERE oi."orderId" = o."id"
    ORDER BY oi."createdAt" ASC
    LIMIT 1
  ), 1),
  "ordererName" = COALESCE(NULLIF(o."shippingName", ''), 'orderer'),
  "ordererPhone" = COALESCE(NULLIF(o."shippingPhone", ''), '00000000000'),
  "paymentStatus" = CASE
    WHEN o."status" = 0 THEN 0
    ELSE 1
  END,
  "fulfillmentStatus" = CASE
    WHEN o."status" = 2 THEN 0
    WHEN o."status" = 3 THEN 1
    WHEN o."status" = 4 THEN 2
    ELSE NULL
  END
WHERE
  o."productType" IS NULL
  OR o."receiveMethod" IS NULL
  OR o."ordererName" IS NULL
  OR o."ordererPhone" IS NULL;

-- 5) enforce not null for required columns
ALTER TABLE "Order"
ALTER COLUMN "productType" SET NOT NULL,
ALTER COLUMN "receiveMethod" SET NOT NULL,
ALTER COLUMN "ordererName" SET NOT NULL,
ALTER COLUMN "ordererPhone" SET NOT NULL;

-- 6) check constraints
ALTER TABLE "Order"
ADD CONSTRAINT "Order_productType_check" CHECK ("productType" IN (0, 1));

ALTER TABLE "Order"
ADD CONSTRAINT "Order_receiveMethod_check" CHECK ("receiveMethod" IN (0, 1));

ALTER TABLE "OrderItem"
ADD CONSTRAINT "OrderItem_quantity_check" CHECK ("quantity" >= 1);

ALTER TABLE "OrderItem"
ADD CONSTRAINT "OrderItem_price_check" CHECK ("price" >= 0);

-- 6-1) DB-level rule for fund orders:
-- fund(productType=0) must contain only one distinct productId per orderId
CREATE OR REPLACE FUNCTION enforce_fund_single_product_per_order()
RETURNS TRIGGER AS $$
DECLARE
  v_product_type INTEGER;
  v_distinct_product_count INTEGER;
BEGIN
  SELECT o."productType"
    INTO v_product_type
  FROM "Order" o
  WHERE o."id" = NEW."orderId";

  IF v_product_type = 0 THEN
    SELECT COUNT(DISTINCT s.pid)
      INTO v_distinct_product_count
    FROM (
      SELECT oi."productId" AS pid
      FROM "OrderItem" oi
      WHERE oi."orderId" = NEW."orderId"
        AND oi."id" <> COALESCE(NEW."id", '')
      UNION ALL
      SELECT NEW."productId" AS pid
    ) s;

    IF v_distinct_product_count > 1 THEN
      RAISE EXCEPTION 'fund order can contain only one distinct productId';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orderitem_fund_single_product ON "OrderItem";
CREATE TRIGGER trg_orderitem_fund_single_product
BEFORE INSERT OR UPDATE OF "orderId", "productId"
ON "OrderItem"
FOR EACH ROW
EXECUTE FUNCTION enforce_fund_single_product_per_order();

-- 7) drop legacy columns
ALTER TABLE "Order"
DROP COLUMN IF EXISTS "shippingAddress",
DROP COLUMN IF EXISTS "shippingName",
DROP COLUMN IF EXISTS "shippingPhone",
DROP COLUMN IF EXISTS "shippingEmail",
DROP COLUMN IF EXISTS "memo",
DROP COLUMN IF EXISTS "status";

-- 8) indexes
DROP INDEX IF EXISTS "Order_status_idx";
CREATE INDEX "Order_productType_receiveMethod_idx" ON "Order"("productType", "receiveMethod");
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");
CREATE INDEX "Order_fulfillmentStatus_idx" ON "Order"("fulfillmentStatus");
