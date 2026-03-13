-- Add manual sold-out toggle field on Product
ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "isSoldOut" BOOLEAN NOT NULL DEFAULT false;
