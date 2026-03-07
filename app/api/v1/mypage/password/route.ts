import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { compare, hash } from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { status: 'error', code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const { currentPassword, newPassword } = await request.json().catch(() => ({}));

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { status: 'error', code: 'INVALID_INPUT', message: '비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { email: session.user.email, signupMethod: 'EMAIL' },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { status: 'error', code: 'USER_NOT_FOUND', message: '사용자를 찾을 수 없거나 이메일 가입 유저가 아닙니다.' },
        { status: 404 }
      );
    }

    const isMatch = await compare(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { status: 'error', code: 'PASSWORD_MISMATCH', message: '현재 비밀번호가 일치하지 않습니다.' },
        { status: 400 }
      );
    }

    // 비밀번호 정규식 (8~20자 영문, 숫자 조합)
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,20}$/;
    if (!passwordRegex.test(newPassword)) {
      return NextResponse.json(
        { 
          status: 'error', 
          code: 'INVALID_PASSWORD_PATTERN', 
          message: '비밀번호는 영문, 숫자 조합으로 8~20자리로 입력해주세요.' 
        },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ status: 'success', message: '비밀번호가 성공적으로 변경되었습니다.' });
  } catch (error: any) {
    console.error('Password change error:', error);
    return NextResponse.json(
      { status: 'error', code: 'SERVER_ERROR', message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  // 현재 비밀번호가 맞는지만 확인하는 용도 (1단계)
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ status: 'error', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { currentPassword } = await request.json().catch(() => ({}));

    const user = await prisma.user.findFirst({
      where: { email: session.user.email, signupMethod: 'EMAIL' },
    });

    if (!user || !user.password) {
      return NextResponse.json({ status: 'error', code: 'USER_NOT_FOUND' }, { status: 404 });
    }

    const isMatch = await compare(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json({ status: 'error', code: 'PASSWORD_MISMATCH' }, { status: 400 });
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    return NextResponse.json({ status: 'error', code: 'SERVER_ERROR' }, { status: 500 });
  }
}
