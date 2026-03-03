ALTER TABLE "Order"
ADD COLUMN "cardCompany" INTEGER,
ADD COLUMN "bankCode" INTEGER,
ADD COLUMN "easyPayProvider" INTEGER;

-- Backfill existing rows to satisfy new conditional constraints.
UPDATE "Order"
SET "cardCompany" = 0
WHERE "paymentMethod" = 0 AND "cardCompany" IS NULL;

UPDATE "Order"
SET "bankCode" = 0
WHERE "paymentMethod" = 1 AND "bankCode" IS NULL;

UPDATE "Order"
SET "easyPayProvider" = 0
WHERE "paymentMethod" = 2 AND "easyPayProvider" IS NULL;

ALTER TABLE "Order"
ADD CONSTRAINT "Order_cardCompany_check"
CHECK ("cardCompany" IS NULL OR "cardCompany" IN (0, 1));

ALTER TABLE "Order"
ADD CONSTRAINT "Order_bankCode_check"
CHECK ("bankCode" IS NULL OR "bankCode" IN (0, 1));

ALTER TABLE "Order"
ADD CONSTRAINT "Order_easyPayProvider_check"
CHECK ("easyPayProvider" IS NULL OR "easyPayProvider" IN (0, 1, 2));

ALTER TABLE "Order"
ADD CONSTRAINT "Order_payment_detail_by_method_check"
CHECK (
  ("paymentMethod" = 0 AND "cardCompany" IS NOT NULL AND "bankCode" IS NULL AND "easyPayProvider" IS NULL)
  OR ("paymentMethod" = 1 AND "bankCode" IS NOT NULL AND "cardCompany" IS NULL AND "easyPayProvider" IS NULL)
  OR ("paymentMethod" = 2 AND "easyPayProvider" IS NOT NULL AND "cardCompany" IS NULL AND "bankCode" IS NULL)
);

CREATE INDEX "Order_cardCompany_idx" ON "Order"("cardCompany");
CREATE INDEX "Order_bankCode_idx" ON "Order"("bankCode");
CREATE INDEX "Order_easyPayProvider_idx" ON "Order"("easyPayProvider");
