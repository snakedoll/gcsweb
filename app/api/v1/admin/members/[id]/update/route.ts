import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

type MemberTypeUpdateBody = {
  id?: string;
  memberType?: number;
  memeberType?: number; // typo compatibility from example payload
};

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return errorResponse(401, 'UNAUTHORIZED', '토큰이 만료되었거나 유효하지 않습니다.');
    }

    const adminUser = await prisma.user.findFirst({ where: { email: session.user.email },
      select: { memberType: true },
    });

    if (!adminUser) {
      return errorResponse(401, 'UNAUTHORIZED', '토큰이 만료되었거나 유효하지 않습니다.');
    }

    if (Number(adminUser.memberType) !== 2) {
      return errorResponse(403, 'FORBIDDEN', '관리자 권한이 없습니다.');
    }

    const body = (await request.json().catch(() => ({}))) as MemberTypeUpdateBody;
    const pathUserId = isNonEmptyString(params?.id) ? params.id.trim() : '';
    const bodyId = body.id;
    const rawMemberType = body.memberType ?? body.memeberType;

    if (!pathUserId || typeof rawMemberType !== 'number' || ![0, 1, 2].includes(rawMemberType)) {
      return errorResponse(400, 'INVALID_INPUT', '사용자 ID 또는 memberType 값이 올바르지 않습니다.');
    }

    if (bodyId !== undefined && (!isNonEmptyString(bodyId) || bodyId.trim() !== pathUserId)) {
      return errorResponse(400, 'INVALID_INPUT', '사용자 ID 또는 memberType 값이 올바르지 않습니다.');
    }

    const user = await prisma.user.findUnique({
      where: { id: pathUserId },
      select: { id: true },
    });

    if (!user) {
      return errorResponse(404, 'USER_NOT_FOUND', '해당 회원을 찾을 수 없습니다.');
    }

    const updated = await prisma.user.update({
      where: { id: pathUserId },
      data: { memberType: rawMemberType },
      select: { id: true, memberType: true },
    });

    return NextResponse.json({
      status: 'success',
      data: {
        user: {
          id: updated.id,
          memberType: updated.memberType,
        },
      },
    });
  } catch (error) {
    console.error('Admin member type update error:', error);
    return errorResponse(500, 'SERVER_ERROR', '서버 오류 발생.');
  }
}
