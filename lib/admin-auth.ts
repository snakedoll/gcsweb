import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

type AdminAuthResult =
  | { ok: true; session: NonNullable<Awaited<ReturnType<typeof getServerSession>>> }
  | { ok: false; reason: 'UNAUTHORIZED' | 'FORBIDDEN' };

export async function requireAdmin(): Promise<AdminAuthResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { ok: false, reason: 'UNAUTHORIZED' };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { memberType: true },
  });

  if (!user || Number(user.memberType) !== 2) {
    return { ok: false, reason: 'FORBIDDEN' };
  }

  return { ok: true, session };
}
