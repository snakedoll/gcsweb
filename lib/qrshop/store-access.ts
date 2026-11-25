import { getServerSession } from 'next-auth';
import type { PrismaClient } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * 현장 운영 화면(현장 포스·전체 주문 조회)에 들어갈 수 있는 상점을 찾는다.
 *
 * - 상점 식별자가 없는 주소에서는 소유한 상점으로 접근한다.
 * - 상점 식별자가 있는 주소에서는 해당 상점의 소유자나 승인된 직원만 접근할 수 있다.
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

type Db = Pick<PrismaClient, 'store'>;

export async function findStoreAccess(
  userId: string,
  storeSlug?: string | null,
  db: Db = prisma,
): Promise<StoreAccess | null> {
  if (storeSlug == null) {
    const store = await db.store.findUnique({ where: { userId }, select: STORE_SELECT });
    return store ? { role: 'OWNER', store } : null;
  }

  const scoped = await db.store.findUnique({
    where: { storeSlug, OR: [{ userId }, { staff: { some: { userId, status: 'APPROVED' } } }] },
    select: { ...STORE_SELECT, userId: true },
  });
  if (!scoped) return null;

  const { userId: ownerId, ...store } = scoped;
  return { role: ownerId === userId ? 'OWNER' : 'STAFF', store };
}

export type StoreAccessContext =
  | { ok: false; reason: 'UNAUTHORIZED' }
  | { ok: true; userId: string; access: StoreAccess | null };

/** 세션 사용자의 상점 접근 권한. 로그인하지 않았으면 ok=false, 접근할 상점이 없으면 access=null. */
export async function getStoreAccess(storeSlug?: string | null): Promise<StoreAccessContext> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return { ok: false, reason: 'UNAUTHORIZED' };
  return { ok: true, userId, access: await findStoreAccess(userId, storeSlug) };
}
