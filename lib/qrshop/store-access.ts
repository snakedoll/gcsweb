import { getServerSession } from 'next-auth';
import type { PrismaClient } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * 현장 운영 화면(현장 포스·전체 주문 조회)에 들어갈 수 있는 상점을 찾는다.
 *
 * - 소유한 상점이 있으면 그 상점(OWNER).
 * - 없으면 승인된 직원으로 등록된 상점(STAFF). 여러 상점에 승인돼 있으면 가장 최근에 승인된 상점을 쓴다.
 *   화면에 상점을 고르는 곳이 없어서다.
 *
 * 상품·상점 관리 API는 지금처럼 소유자만 쓴다(`getSellerContext`). 직원이 쓰는 API만 이 헬퍼를 쓴다.
 */

export type StoreRole = 'OWNER' | 'STAFF';

export type AccessibleStore = {
  storeId: string;
  name: string;
  storeSlug: string;
  createdAt: Date;
};

export type StoreAccess = { role: StoreRole; store: AccessibleStore };

const STORE_SELECT = { storeId: true, name: true, storeSlug: true, createdAt: true } as const;

type Db = Pick<PrismaClient, 'store' | 'storeStaff'>;

export async function findStoreAccess(userId: string, db: Db = prisma): Promise<StoreAccess | null> {
  const owned = await db.store.findUnique({ where: { userId }, select: STORE_SELECT });
  if (owned) return { role: 'OWNER', store: owned };

  const staff = await db.storeStaff.findFirst({
    where: { userId, status: 'APPROVED' },
    orderBy: [{ approvedAt: 'desc' }, { id: 'desc' }],
    select: { store: { select: STORE_SELECT } },
  });
  return staff ? { role: 'STAFF', store: staff.store } : null;
}

export type StoreAccessContext =
  | { ok: false; reason: 'UNAUTHORIZED' }
  | { ok: true; userId: string; access: StoreAccess | null };

/** 세션 사용자의 상점 접근 권한. 로그인하지 않았으면 ok=false, 접근할 상점이 없으면 access=null. */
export async function getStoreAccess(): Promise<StoreAccessContext> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return { ok: false, reason: 'UNAUTHORIZED' };
  return { ok: true, userId, access: await findStoreAccess(userId) };
}
