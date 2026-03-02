import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { message: auth.reason === 'UNAUTHORIZED' ? 'Unauthorized' : 'Forbidden' },
      { status: auth.reason === 'UNAUTHORIZED' ? 401 : 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim() ?? '';

  const where = search
    ? { name: { contains: search, mode: 'insensitive' as const } }
    : {};

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      phone: true,
      memberType: true,
      major: true,
      nickname: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    members: users.map((u) => ({
      id: u.id,
      name: u.name,
      phone: u.phone ?? '',
      major: u.major ?? '',
      nickname: u.nickname ?? '',
      role:
        Number(u.memberType) === 2
          ? 'admin'
          : Number(u.memberType) === 1
          ? 'major'
          : 'general',
    })),
  });
}
