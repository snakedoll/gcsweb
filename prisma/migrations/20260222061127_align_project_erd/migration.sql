/*
  Warnings:

  - The primary key for the `Project` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `detailImgUrl` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnailImgUrl` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `year` on the `Project` table. All the data in the column will be lost.
  - Added the required column `categoryId` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `detailUrl` to the `Project` table without a default value. This is not possible if the table is not empty.
  - The required column `projectId` was added to the `Project` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `teamId` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `thumbnailUrl` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `yearId` to the `Project` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Like" DROP CONSTRAINT "Like_projectId_fkey";

-- DropIndex
DROP INDEX "Project_year_idx";

-- AlterTable
ALTER TABLE "Project" DROP CONSTRAINT "Project_pkey",
DROP COLUMN "detailImgUrl",
DROP COLUMN "id",
DROP COLUMN "thumbnailImgUrl",
DROP COLUMN "year",
ADD COLUMN     "categoryId" TEXT NOT NULL,
ADD COLUMN     "detailUrl" TEXT NOT NULL,
ADD COLUMN     "hardDeleteAt" TIMESTAMP(3),
ADD COLUMN     "ishome" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "projectId" TEXT NOT NULL,
ADD COLUMN     "softDeletedAt" TIMESTAMP(3),
ADD COLUMN     "teamId" TEXT NOT NULL,
ADD COLUMN     "thumbnailUrl" TEXT NOT NULL,
ADD COLUMN     "yearId" TEXT NOT NULL,
ALTER COLUMN "isPublic" SET DEFAULT false,
ADD CONSTRAINT "Project_pkey" PRIMARY KEY ("projectId");

-- CreateTable
CREATE TABLE "Scrap" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scrap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project Category" (
    "categoryId" TEXT NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "Project Category_pkey" PRIMARY KEY ("categoryId")
);

-- CreateTable
CREATE TABLE "Proejct Year" (
    "yearId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,

    CONSTRAINT "Proejct Year_pkey" PRIMARY KEY ("yearId")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "linkUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Scrap_userId_idx" ON "Scrap"("userId");

-- CreateIndex
CREATE INDEX "Scrap_projectId_idx" ON "Scrap"("projectId");

-- CreateIndex
CREATE INDEX "Scrap_productId_idx" ON "Scrap"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Scrap_userId_projectId_key" ON "Scrap"("userId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Scrap_userId_productId_key" ON "Scrap"("userId", "productId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Project_teamId_idx" ON "Project"("teamId");

-- CreateIndex
CREATE INDEX "Project_categoryId_idx" ON "Project"("categoryId");

-- CreateIndex
CREATE INDEX "Project_yearId_idx" ON "Project"("yearId");

-- CreateIndex
CREATE INDEX "Project_ishome_idx" ON "Project"("ishome");

-- CreateIndex
CREATE INDEX "Project_softDeletedAt_idx" ON "Project"("softDeletedAt");

-- AddForeignKey
ALTER TABLE "Scrap" ADD CONSTRAINT "Scrap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scrap" ADD CONSTRAINT "Scrap_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("projectId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scrap" ADD CONSTRAINT "Scrap_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Project Category"("categoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "Proejct Year"("yearId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("projectId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
