import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 1. 인증 확인 (토큰 유효성)
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        {
          status: 'error',
          code: 'UNAUTHORIZED',
          message: '토큰이 만료되었거나 유효하지 않습니다.',
        },
        { status: 401 }
      );
    }

    // 2. 관리자 권한 확인 (DB 조회)
    const adminUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    // memberType 2: admin
    if (!adminUser || Number(adminUser.memberType) !== 2) {
      return NextResponse.json(
        {
          status: 'error',
          code: 'UNAUTHORIZED',
          message: '접근 권한이 없습니다.',
        },
        { status: 401 }
      );
    }

    // 3. 요청 Body 검증 (confirmText)
    const body = await request.json().catch(() => null);
    
    if (!body || body.confirmText !== '삭제하겠습니다') {
      return NextResponse.json(
        {
          status: 'error',
          code: 'INVALID_INPUT',
          message: '확인 문구가 올바르지 않습니다.',
        },
        { status: 400 }
      );
    }

    // 4. 회원 삭제
    const deletedUser = await prisma.user.delete({
      where: { id: params.id },
    });

    // 5. 성공 응답
    return NextResponse.json({
      status: 'success',
      data: {
        user: {
          id: deletedUser.id,
        },
      },
    });
  } catch (error: any) {
    console.error('Admin member delete error:', error);
    return NextResponse.json(
      {
        status: 'error',
        code: 'SERVER_ERROR',
        message: '서버 내부 로직 오류',
      },
      { status: 500 }
    );
  }
}