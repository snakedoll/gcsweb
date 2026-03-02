ALTER TABLE "Order"
ADD COLUMN "paymentMethod" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Order"
ADD CONSTRAINT "Order_paymentMethod_check" CHECK ("paymentMethod" IN (0, 1, 2));

ALTER TABLE "Order"
ADD CONSTRAINT "Order_paymentMethod_by_productType_check" CHECK (
  ("productType" = 0 AND "paymentMethod" IN (0, 1))
  OR ("productType" = 1 AND "paymentMethod" IN (0, 1, 2))
);

ALTER TABLE "Order"
ALTER COLUMN "paymentMethod" DROP DEFAULT;

CREATE INDEX "Order_paymentMethod_idx" ON "Order"("paymentMethod");
