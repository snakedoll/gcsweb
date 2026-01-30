import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

function isEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const email = body?.email;
    const type = body?.type ?? 'register';
    const code = body?.code;

    if (!email || !code) {
      return jsonError(400, 'INVALID_INPUT', '필수 정보가 누락되었습니다.');
    }

    if (!isEmail(email)) {
      return jsonError(400, 'INVALID_FORMAT', '올바른 이메일 형식이 아닙니다.');
    }

    if (type !== 'register') {
      return jsonError(400, 'INVALID_INPUT', '필수 정보가 누락되었습니다.');
    }

    if (typeof code !== 'string' || code.trim().length === 0) {
      return jsonError(400, 'INVALID_INPUT', '필수 정보가 누락되었습니다.');
    }

    const identifier = `verify:${type}:${email}`;
    const tokenHash = sha256(code.trim());

    const token = await prisma.verificationToken.findFirst({
      where: { identifier, token: tokenHash },
      orderBy: { createdAt: 'desc' },
      select: { id: true, expires: true },
    });

    if (!token) {
      return jsonError(400, 'INVALID_CODE', '인증번호가 올바르지 않습니다.');
    }

    if (token.expires.getTime() < Date.now()) {
      await prisma.verificationToken.delete({ where: { id: token.id } });
      return jsonError(400, 'CODE_EXPIRED', '인증번호가 만료되었습니다.');
    }

    // mark verified if user exists
    await prisma.user.updateMany({
      where: { email },
      data: { isVerified: true },
    });

    // consume token
    await prisma.verificationToken.delete({ where: { id: token.id } });

    return NextResponse.json(
      {
        status: 'success',
        data: {
          message: '이메일 인증이 완료되었습니다.',
        },
      },
      { status: 200 }
    );
  } catch (e) {
    console.error('verify code error:', e);
    return jsonError(500, 'SERVER_ERROR', '서버 오류 발생.');
  }
}

