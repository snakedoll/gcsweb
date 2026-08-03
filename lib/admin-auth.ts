import { getServerSession, type Session } from 'next-auth';
import type { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiError } from '@/lib/api-response';

type AdminAuthResult =
  | { ok: true; session: Session }
  | { ok: false; response: NextResponse };

export async function requireAdmin(): Promise<AdminAuthResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { ok: false, response: apiError(401, 'UNAUTHORIZED', '로그인이 필요합니다.') };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { memberType: true },
  });

  if (!user || Number(user.memberType) !== 2) {
    return { ok: false, response: apiError(403, 'FORBIDDEN', '관리자 권한이 필요합니다.') };
  }

  return { ok: true, session };
}
