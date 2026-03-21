/*
  Warnings:

  - You are about to drop the column `likeCount` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `notificationCount` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[productId,optionName]` on the table `ProductOption` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[optionId,value]` on the table `ProductOptionValue` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,postId]` on the table `Scrap` will be added. If there are existing duplicate values, this will fail.
  - Made the column `description` on table `Product` required. This step will fail if there are existing NULL values in that column.
  - Made the column `salesStartDate` on table `Product` required. This step will fail if there are existing NULL values in that column.
  - Made the column `salesEndDate` on table `Product` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX IF EXISTS "Order_bankCode_idx";

-- DropIndex
DROP INDEX IF EXISTS "Order_cardCompany_idx";

-- DropIndex
DROP INDEX IF EXISTS "Order_easyPayProvider_idx";

-- DropIndex
DROP INDEX IF EXISTS "Order_paymentMethod_idx";

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "salesStartDate" SET NOT NULL,
ALTER COLUMN "salesEndDate" SET NOT NULL;

-- AlterTable
ALTER TABLE "ProductImage" ALTER COLUMN "noticeImgUrl" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Scrap" ADD COLUMN     "postId" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "likeCount",
DROP COLUMN "notificationCount";

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" INTEGER NOT NULL,
    "optionData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cart_userId_idx" ON "Cart"("userId");

-- CreateIndex
CREATE INDEX "CartItem_cartId_idx" ON "CartItem"("cartId");

-- CreateIndex
CREATE INDEX "CartItem_productId_idx" ON "CartItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOption_productId_optionName_key" ON "ProductOption"("productId", "optionName");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOptionValue_optionId_value_key" ON "ProductOptionValue"("optionId", "value");

-- CreateIndex
CREATE INDEX "Scrap_postId_idx" ON "Scrap"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "Scrap_userId_postId_key" ON "Scrap"("userId", "postId");

-- AddForeignKey
ALTER TABLE "Scrap" ADD CONSTRAINT "Scrap_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "ProductUpdateRequestOption_productUpdateRequestId_optionName_ke" RENAME TO "ProductUpdateRequestOption_productUpdateRequestId_optionNam_key";
