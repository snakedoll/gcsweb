import { createHash, randomInt } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { emailTemplates, sendEmail } from '@/lib/email';

export const runtime = 'nodejs';

type ErrorPayload = {
  status: 'error';
  code: string;
  message: string;
};

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json<ErrorPayload>(
    { status: 'error', code, message },
    { status }
  );
}

function isEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function generate6DigitCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const email = body?.email;
    const type = body?.type ?? 'register';

    if (!email) {
      return jsonError(400, 'INVALID_INPUT', '필수값이 누락되었습니다.');
    }

    if (!isEmail(email)) {
      return jsonError(400, 'INVALID_FORMAT', '올바른 이메일 형식이 아닙니다.');
    }

    if (type !== 'register') {
      return jsonError(400, 'INVALID_INPUT', '지원하지 않는 인증 타입입니다.');
    }

    const identifier = `verify:${type}:${email}`;

    // 60초 이내 재전송 제한
    const recent = await prisma.verificationToken.findFirst({
      where: { identifier },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    if (recent && Date.now() - recent.createdAt.getTime() < 60_000) {
      return jsonError(429, 'TOO_MANY_REQUESTS', '잠시 후 다시 시도해주세요.');
    }

    const code = generate6DigitCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10분

    // 동일 email/type 토큰은 1개만 유지
    await prisma.verificationToken.deleteMany({ where: { identifier } });

    await prisma.verificationToken.create({
      data: {
        identifier,
        token: sha256(code),
        expires,
      },
    });

    try {
      await sendEmail({
        to: email,
        subject: '[GCS] 이메일 인증번호 안내',
        html: emailTemplates.verificationCode(code),
      });
    } catch {
      await prisma.verificationToken.deleteMany({ where: { identifier } });
      return jsonError(500, 'EMAIL_SEND_FAILED', '이메일 전송에 실패했습니다.');
    }

    return NextResponse.json(
      {
        status: 'success',
        data: {
          message: '인증 메일이 전송되었습니다.',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('send verification error:', error);
    return jsonError(500, 'SERVER_ERROR', '서버 오류가 발생했습니다.');
  }
}
