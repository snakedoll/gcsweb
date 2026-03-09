-- Add product and option snapshot fields to option value tables
ALTER TABLE "ProductOptionValue" ADD COLUMN IF NOT EXISTS "productId" TEXT;
ALTER TABLE "ProductOptionValue" ADD COLUMN IF NOT EXISTS "productName" TEXT;
ALTER TABLE "ProductOptionValue" ADD COLUMN IF NOT EXISTS "optionName" TEXT;

ALTER TABLE "ProductUpdateRequestOptionValue" ADD COLUMN IF NOT EXISTS "productId" TEXT;
ALTER TABLE "ProductUpdateRequestOptionValue" ADD COLUMN IF NOT EXISTS "productName" TEXT;
ALTER TABLE "ProductUpdateRequestOptionValue" ADD COLUMN IF NOT EXISTS "optionName" TEXT;

-- Backfill ProductOptionValue from ProductOption
UPDATE "ProductOptionValue" pov
SET
  "productId" = po."productId",
  "productName" = po."productName",
  "optionName" = po."optionName"
FROM "ProductOption" po
WHERE po."id" = pov."optionId";

-- Backfill ProductUpdateRequestOptionValue from ProductUpdateRequestOption + ProductUpdateRequest
UPDATE "ProductUpdateRequestOptionValue" prov
SET
  "productId" = pur."productId",
  "productName" = pro."productName",
  "optionName" = pro."optionName"
FROM "ProductUpdateRequestOption" pro
JOIN "ProductUpdateRequest" pur ON pur."id" = pro."productUpdateRequestId"
WHERE pro."id" = prov."optionId";

-- Enforce non-null
UPDATE "ProductOptionValue" SET "productId" = '' WHERE "productId" IS NULL;
UPDATE "ProductOptionValue" SET "productName" = '' WHERE "productName" IS NULL;
UPDATE "ProductOptionValue" SET "optionName" = '' WHERE "optionName" IS NULL;
UPDATE "ProductUpdateRequestOptionValue" SET "productId" = '' WHERE "productId" IS NULL;
UPDATE "ProductUpdateRequestOptionValue" SET "productName" = '' WHERE "productName" IS NULL;
UPDATE "ProductUpdateRequestOptionValue" SET "optionName" = '' WHERE "optionName" IS NULL;

ALTER TABLE "ProductOptionValue" ALTER COLUMN "productId" SET NOT NULL;
ALTER TABLE "ProductOptionValue" ALTER COLUMN "productName" SET NOT NULL;
ALTER TABLE "ProductOptionValue" ALTER COLUMN "optionName" SET NOT NULL;
ALTER TABLE "ProductUpdateRequestOptionValue" ALTER COLUMN "productId" SET NOT NULL;
ALTER TABLE "ProductUpdateRequestOptionValue" ALTER COLUMN "productName" SET NOT NULL;
ALTER TABLE "ProductUpdateRequestOptionValue" ALTER COLUMN "optionName" SET NOT NULL;

-- Query indexes
CREATE INDEX IF NOT EXISTS "ProductOptionValue_productId_idx" ON "ProductOptionValue"("productId");
CREATE INDEX IF NOT EXISTS "ProductOptionValue_productId_optionName_idx" ON "ProductOptionValue"("productId", "optionName");
CREATE INDEX IF NOT EXISTS "ProductUpdateRequestOptionValue_productId_idx" ON "ProductUpdateRequestOptionValue"("productId");
CREATE INDEX IF NOT EXISTS "ProductUpdateRequestOptionValue_productId_optionName_idx" ON "ProductUpdateRequestOptionValue"("productId", "optionName");
