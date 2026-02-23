import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      nickname: true,
      phone: true,
      profileImage: true,
      memberType: true,
      isSeller: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { message: 'User not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    nickname: user.nickname,
    phone: user.phone ?? undefined,
    profileImage: user.profileImage ?? undefined,
    role: Number(user.memberType) === 2 ? 'admin' : 'user',
    isSeller: user.isSeller,
    createdAt: user.createdAt.toISOString(),
  });
}
