-- Add snapshot name columns used for FK to parent name
ALTER TABLE "ProductOption" ADD COLUMN IF NOT EXISTS "productName" TEXT;
ALTER TABLE "ProductUpdateRequestOption" ADD COLUMN IF NOT EXISTS "productName" TEXT;

-- Backfill from parent entities
UPDATE "ProductOption" po
SET "productName" = p."name"
FROM "Product" p
WHERE p."id" = po."productId"
  AND (po."productName" IS NULL OR po."productName" = '');

UPDATE "ProductUpdateRequestOption" pro
SET "productName" = pur."name"
FROM "ProductUpdateRequest" pur
WHERE pur."id" = pro."productUpdateRequestId"
  AND (pro."productName" IS NULL OR pro."productName" = '');

-- Ensure parent composite uniqueness for composite FK references
CREATE UNIQUE INDEX IF NOT EXISTS "Product_id_name_key" ON "Product"("id", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "ProductUpdateRequest_id_name_key" ON "ProductUpdateRequest"("id", "name");

-- Make new columns non-null
UPDATE "ProductOption" SET "productName" = '' WHERE "productName" IS NULL;
UPDATE "ProductUpdateRequestOption" SET "productName" = '' WHERE "productName" IS NULL;
ALTER TABLE "ProductOption" ALTER COLUMN "productName" SET NOT NULL;
ALTER TABLE "ProductUpdateRequestOption" ALTER COLUMN "productName" SET NOT NULL;

-- Replace single-column foreign keys with composite foreign keys (id + name)
ALTER TABLE "ProductOption" DROP CONSTRAINT IF EXISTS "ProductOption_productId_fkey";
ALTER TABLE "ProductOption"
ADD CONSTRAINT "ProductOption_productId_productName_fkey"
FOREIGN KEY ("productId", "productName")
REFERENCES "Product"("id", "name")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "ProductUpdateRequestOption" DROP CONSTRAINT IF EXISTS "ProductUpdateRequestOption_productUpdateRequestId_fkey";
ALTER TABLE "ProductUpdateRequestOption"
ADD CONSTRAINT "ProductUpdateRequestOption_productUpdateRequestId_productName_fkey"
FOREIGN KEY ("productUpdateRequestId", "productName")
REFERENCES "ProductUpdateRequest"("id", "name")
ON DELETE CASCADE
ON UPDATE CASCADE;
