-- 직원 관리: 초대 링크 코드와 상점 직원 테이블.
-- 데이터를 지우거나 바꾸지 않는다. 기존 상점에는 초대 코드를 새로 채운다.

-- CreateEnum
CREATE TYPE "StoreStaffStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- 기존 상점 행이 있으므로 nullable로 추가 → 무작위 코드로 채움 → NOT NULL.
-- 새 상점은 Prisma가 cuid로 채운다(@default(cuid())).
ALTER TABLE "Store" ADD COLUMN "staffInviteCode" TEXT;
UPDATE "Store"
SET "staffInviteCode" = md5(random()::text || clock_timestamp()::text || "storeId")
WHERE "staffInviteCode" IS NULL;
ALTER TABLE "Store" ALTER COLUMN "staffInviteCode" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Store_staffInviteCode_key" ON "Store"("staffInviteCode");

-- CreateTable
CREATE TABLE "StoreStaff" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "StoreStaffStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreStaff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreStaff_userId_status_idx" ON "StoreStaff"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StoreStaff_storeId_userId_key" ON "StoreStaff"("storeId", "userId");

-- AddForeignKey
ALTER TABLE "StoreStaff" ADD CONSTRAINT "StoreStaff_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("storeId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreStaff" ADD CONSTRAINT "StoreStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
