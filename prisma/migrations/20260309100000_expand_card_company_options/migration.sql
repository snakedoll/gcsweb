ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_cardCompany_check";

ALTER TABLE "Order"
ADD CONSTRAINT "Order_cardCompany_check"
CHECK ("cardCompany" IS NULL OR "cardCompany" IN (0, 1, 2, 3, 4, 5, 6, 7, 8, 9));
