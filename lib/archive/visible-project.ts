import type { Prisma } from '@prisma/client';

/** 사용자에게 보여 줄 수 있는 아카이브 프로젝트: 공개이고 삭제되지 않은 것. 스크랩 목록과 마이페이지 스크랩 개수가 같이 쓴다. */
export const VISIBLE_PROJECT_WHERE = {
  isPublic: true,
  softDeletedAt: null,
} satisfies Prisma.ProjectWhereInput;
