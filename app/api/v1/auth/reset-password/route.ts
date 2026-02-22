import { hash } from 'bcryptjs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

type ErrorPayload = {
  status: 'error';
  code: string;
  message: string;
};

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json<ErrorPayload>({ status: 'error', code, message }, { status });
}

function isStrongPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const token = body?.token;
    const password = body?.password;
    const confirmPassword = body?.confirmPassword;

    if (!token || !password || !confirmPassword) {
      return jsonError(400, 'INVALID_INPUT', '필수값이 누락되었습니다.');
    }

    if (!isStrongPassword(password)) {
      return jsonError(400, 'WEAK_PASSWORD', '비밀번호 규칙을 충족하지 않습니다.');
    }

    if (password !== confirmPassword) {
      return jsonError(400, 'PASSWORD_MISMATCH', '비밀번호가 일치하지 않습니다.');
    }

    const resetRecord = await prisma.verificationToken.findFirst({
      where: {
        identifier: { startsWith: 'reset:' },
        token,
      },
      select: { identifier: true, expires: true },
    });

    if (!resetRecord) {
      return jsonError(400, 'INVALID_TOKEN', '유효하지 않은 링크입니다.');
    }

    if (resetRecord.expires.getTime() < Date.now()) {
      await prisma.verificationToken.deleteMany({
        where: { identifier: resetRecord.identifier, token },
      });
      return jsonError(400, 'TOKEN_EXPIRED', '링크가 만료되었습니다.');
    }

    const email = resetRecord.identifier.replace(/^reset:/, '');
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) {
      await prisma.verificationToken.deleteMany({
        where: { identifier: resetRecord.identifier, token },
      });
      return jsonError(400, 'USER_NOT_FOUND', '해당 이메일로 가입한 계정이 없습니다.');
    }

    const hashedPassword = await hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    await prisma.verificationToken.deleteMany({
      where: { identifier: resetRecord.identifier, token },
    });

    return NextResponse.json({ status: 'success', data: { message: '비밀번호가 변경되었습니다.' } }, { status: 200 });
  } catch (error) {
    console.error('reset password error:', error);
    return jsonError(500, 'SERVER_ERROR', '서버 오류가 발생했습니다.');
  }
}
