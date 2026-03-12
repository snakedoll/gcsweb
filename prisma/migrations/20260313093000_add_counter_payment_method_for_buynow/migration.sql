ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_paymentMethod_check";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_paymentMethod_by_productType_check";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_payment_detail_by_method_check";

ALTER TABLE "Order"
ADD CONSTRAINT "Order_paymentMethod_check"
CHECK ("paymentMethod" IN (0, 1, 2, 3));

ALTER TABLE "Order"
ADD CONSTRAINT "Order_paymentMethod_by_productType_check" CHECK (
  ("productType" = 0 AND "paymentMethod" IN (0, 1))
  OR ("productType" = 1 AND "paymentMethod" IN (0, 1, 2, 3))
);

ALTER TABLE "Order"
ADD CONSTRAINT "Order_payment_detail_by_method_check"
CHECK (
  ("paymentMethod" = 0 AND "cardCompany" IS NOT NULL AND "bankCode" IS NULL AND "easyPayProvider" IS NULL)
  OR ("paymentMethod" = 1 AND "bankCode" IS NOT NULL AND "cardCompany" IS NULL AND "easyPayProvider" IS NULL)
  OR ("paymentMethod" = 2 AND "easyPayProvider" IS NOT NULL AND "cardCompany" IS NULL AND "bankCode" IS NULL)
  OR ("paymentMethod" = 3 AND "cardCompany" IS NULL AND "bankCode" IS NULL AND "easyPayProvider" IS NULL)
);
