ALTER TABLE "Product"
ADD COLUMN "publicAt" TIMESTAMP(3);

UPDATE "Product"
SET "publicAt" = COALESCE("updatedAt", "createdAt")
WHERE "isPublic" = true
  AND "publicAt" IS NULL;
