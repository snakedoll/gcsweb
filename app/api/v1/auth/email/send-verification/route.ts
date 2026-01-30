import { NextResponse } from 'next/server';
import { createHash, randomInt } from 'crypto';
import { prisma } from '@/lib/db';
import { emailTemplates, sendEmail } from '@/lib/email';

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

function generate6DigitCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const email = body?.email;
    const type = body?.type ?? 'register';

    if (!email) {
      return jsonError(400, 'INVALID_INPUT', '필수 정보가 누락되었습니다.');
    }

    if (!isEmail(email)) {
      return jsonError(400, 'INVALID_FORMAT', '올바른 이메일 형식이 아닙니다.');
    }

    if (type !== 'register') {
      return jsonError(400, 'INVALID_INPUT', '필수 정보가 누락되었습니다.');
    }

    const identifier = `verify:${type}:${email}`;

    // Basic cooldown: prevent re-send within 60 seconds
    const recent = await prisma.verificationToken.findFirst({
      where: { identifier },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    if (recent && Date.now() - recent.createdAt.getTime() < 60_000) {
      return jsonError(429, 'TOO_MANY_REQUESTS', '잠시 후 다시 시도해주세요.');
    }

    const code = generate6DigitCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // keep only one active code per email/type
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
      // cleanup token if email send fails
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
  } catch (e) {
    console.error('send verification error:', e);
    return jsonError(500, 'SERVER_ERROR', '서버 오류 발생.');
  }
}

