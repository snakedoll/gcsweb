-- Cleans up pre-existing drift between the migration history and schema.prisma:
-- News/Review/ReviewImage/FairShopHistoryTable were removed from schema.prisma
-- previously but the tables were never dropped from the database. Order.impUid
-- was added to schema.prisma but no migration ever added the column.

-- DropForeignKey
ALTER TABLE "FairShopHistoryTable" DROP CONSTRAINT "FairShopHistoryTable_orderId_fkey";

-- DropForeignKey
ALTER TABLE "Like" DROP CONSTRAINT "Like_newsId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_productId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_userId_fkey";

-- DropForeignKey
ALTER TABLE "ReviewImage" DROP CONSTRAINT "ReviewImage_reviewId_fkey";

-- DropIndex
DROP INDEX "Like_userId_newsId_key";

-- AlterTable
ALTER TABLE "Like" DROP COLUMN "newsId";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "impUid" TEXT;

-- DropTable
DROP TABLE "FairShopHistoryTable";

-- DropTable
DROP TABLE "News";

-- DropTable
DROP TABLE "Review";

-- DropTable
DROP TABLE "ReviewImage";

-- CreateIndex
CREATE UNIQUE INDEX "Order_impUid_key" ON "Order"("impUid");
