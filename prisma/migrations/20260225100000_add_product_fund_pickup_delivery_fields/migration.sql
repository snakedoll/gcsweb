-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "productionEndDate" TIMESTAMP(3),
ADD COLUMN     "deliveryEndDate" TIMESTAMP(3),
ADD COLUMN     "pickupStartDate" TIMESTAMP(3),
ADD COLUMN     "pickupEndDate" TIMESTAMP(3),
ADD COLUMN     "pickupLocation" TEXT;
