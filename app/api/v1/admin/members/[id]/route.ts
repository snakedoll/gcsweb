import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { message: auth.reason === 'UNAUTHORIZED' ? 'Unauthorized' : 'Forbidden' },
      { status: auth.reason === 'UNAUTHORIZED' ? 401 : 403 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      profileImage: true,
      memberType: true,
      isSeller: true,
      nickname: true,
      studentId: true,
      major: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? '',
    profileImage: user.profileImage ?? undefined,
    memberType: user.memberType,
    isSeller: user.isSeller,
    nickname: user.nickname ?? undefined,
    studentId: user.studentId ?? undefined,
    major: user.major ?? undefined,
    createdAt: user.createdAt.toISOString(),
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { message: auth.reason === 'UNAUTHORIZED' ? 'Unauthorized' : 'Forbidden' },
      { status: auth.reason === 'UNAUTHORIZED' ? 401 : 403 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
  });

  if (!user) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 });
  }

  await prisma.user.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
}
