import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session?.user?.role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
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
