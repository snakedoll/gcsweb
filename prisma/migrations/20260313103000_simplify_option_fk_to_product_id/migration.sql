-- Simplify option relations to single-column FK (productId / productUpdateRequestId)

-- 1) Remove composite-name foreign keys if present
ALTER TABLE "ProductOption"
DROP CONSTRAINT IF EXISTS "ProductOption_productId_productName_fkey";

ALTER TABLE "ProductUpdateRequestOption"
DROP CONSTRAINT IF EXISTS "ProductUpdateRequestOption_productUpdateRequestId_productName_fkey";

ALTER TABLE "ProductUpdateRequestOption"
DROP CONSTRAINT IF EXISTS "ProductUpdateRequestOption_productUpdateRequestId_productName_f";

-- 2) Restore single-column foreign keys
DO $$
BEGIN
  ALTER TABLE "ProductOption"
  ADD CONSTRAINT "ProductOption_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ProductUpdateRequestOption"
  ADD CONSTRAINT "ProductUpdateRequestOption_productUpdateRequestId_fkey"
  FOREIGN KEY ("productUpdateRequestId") REFERENCES "ProductUpdateRequest"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3) Remove no-longer-needed composite uniqueness on parent tables
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_id_name_key";
ALTER TABLE "ProductUpdateRequest" DROP CONSTRAINT IF EXISTS "ProductUpdateRequest_id_name_key";
DROP INDEX IF EXISTS "Product_id_name_key";
DROP INDEX IF EXISTS "ProductUpdateRequest_id_name_key";

-- 4) Drop snapshot name columns from option tables
ALTER TABLE "ProductOption" DROP COLUMN IF EXISTS "productName";
ALTER TABLE "ProductOptionValue" DROP COLUMN IF EXISTS "productName";
ALTER TABLE "ProductUpdateRequestOption" DROP COLUMN IF EXISTS "productName";
ALTER TABLE "ProductUpdateRequestOptionValue" DROP COLUMN IF EXISTS "productName";
