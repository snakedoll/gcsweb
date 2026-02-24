-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "isSalesTeam" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: accountUrl이 있는 기존 팀은 판매팀으로 설정
UPDATE "Team" SET "isSalesTeam" = true WHERE "accountUrl" != '';
