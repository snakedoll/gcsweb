import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-response';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

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
      createdAt: true,
    },
  });

  if (!user) {
    return apiErrors.notFound('User not found');
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? '',
    profileImage: user.profileImage ?? undefined,
    memberType: user.memberType,
    createdAt: user.createdAt.toISOString(),
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const user = await prisma.user.findUnique({
    where: { id: params.id },
  });

  if (!user) {
    return apiErrors.notFound('User not found');
  }

  await prisma.user.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
}
