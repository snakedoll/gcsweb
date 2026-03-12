-- Align receiveMethod policy by product type:
-- type=0(Fund): 0 or 1
-- type=1(BuyNow): 1
-- type=2(PartnerUp): NULL

-- Normalize existing Product data before constraints.
UPDATE "Product"
SET "receiveMethod" = 1
WHERE "type" = 1
  AND "receiveMethod" IS DISTINCT FROM 1;

UPDATE "Product"
SET "receiveMethod" = NULL
WHERE "type" = 2;

UPDATE "Product"
SET "receiveMethod" = 0
WHERE "type" = 0
  AND "receiveMethod" IS NULL;

ALTER TABLE "Product"
ALTER COLUMN "receiveMethod" DROP NOT NULL,
ALTER COLUMN "receiveMethod" DROP DEFAULT;

ALTER TABLE "Product"
DROP CONSTRAINT IF EXISTS "Product_receiveMethod_by_type_check";

ALTER TABLE "Product"
ADD CONSTRAINT "Product_receiveMethod_by_type_check"
CHECK (
  ("type" = 0 AND "receiveMethod" IN (0, 1))
  OR ("type" = 1 AND "receiveMethod" = 1)
  OR ("type" = 2 AND "receiveMethod" IS NULL)
);

-- Normalize existing ProductUpdateRequest data before constraints.
UPDATE "ProductUpdateRequest"
SET "receiveMethod" = 1
WHERE "type" = 1
  AND "receiveMethod" IS DISTINCT FROM 1;

UPDATE "ProductUpdateRequest"
SET "receiveMethod" = NULL
WHERE "type" = 2;

UPDATE "ProductUpdateRequest"
SET "receiveMethod" = 0
WHERE "type" = 0
  AND "receiveMethod" IS NULL;

ALTER TABLE "ProductUpdateRequest"
ALTER COLUMN "receiveMethod" DROP NOT NULL,
ALTER COLUMN "receiveMethod" DROP DEFAULT;

ALTER TABLE "ProductUpdateRequest"
DROP CONSTRAINT IF EXISTS "ProductUpdateRequest_receiveMethod_by_type_check";

ALTER TABLE "ProductUpdateRequest"
ADD CONSTRAINT "ProductUpdateRequest_receiveMethod_by_type_check"
CHECK (
  ("type" = 0 AND "receiveMethod" IN (0, 1))
  OR ("type" = 1 AND "receiveMethod" = 1)
  OR ("type" = 2 AND "receiveMethod" IS NULL)
);
