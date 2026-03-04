import { createHash } from 'crypto';
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
  return NextResponse.json<ErrorPayload>(
    { status: 'error', code, message },
    { status }
  );
}

function isEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isStrongPassword(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 8 &&
    /[A-Za-z]/.test(value) &&
    /\d/.test(value) &&
    /^[A-Za-z\d]+$/.test(value)
  );
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function normalizeNicknameBase(email: string) {
  const local = email.split('@')[0] ?? 'user';
  const cleaned = local.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
  return cleaned.length >= 2 ? cleaned : `user${cleaned}`;
}

async function createUniqueNickname(email: string) {
  const base = normalizeNicknameBase(email);
  const candidates = [
    base,
    ...Array.from({ length: 9 }, (_, i) => `${base}${String(i + 1).padStart(4, '0')}`),
  ];

  for (const candidate of candidates) {
    const exists = await prisma.user.findUnique({
      where: { nickname: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }

  return `${base}${Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, '0')}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    const name = body?.name;
    const phone = body?.phone;
    const email = body?.email;
    const password = body?.password;
    const confirmPassword = body?.confirmPassword;
    const verificationCode = body?.verificationCode;

    if (
      !name ||
      !phone ||
      !email ||
      !password ||
      !confirmPassword ||
      !verificationCode
    ) {
      return jsonError(400, 'INVALID_INPUT', '필수값이 누락되었습니다.');
    }

    if (!isEmail(email)) {
      return jsonError(400, 'INVALID_FORMAT', '올바른 이메일 형식이 아닙니다.');
    }

    if (!isStrongPassword(password)) {
      return jsonError(400, 'WEAK_PASSWORD', '비밀번호 규칙을 충족하지 않습니다.');
    }

    if (password !== confirmPassword) {
      return jsonError(400, 'PASSWORD_MISMATCH', '비밀번호가 일치하지 않습니다.');
    }

    const existingUser = await prisma.user.findFirst({ where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return jsonError(409, 'EMAIL_EXISTS', '이미 사용 중인 이메일입니다.');
    }

    const identifier = `verify:register:${email}`;
    const codeHash = sha256(String(verificationCode).trim());

    const token = await prisma.verificationToken.findFirst({
      where: { identifier, token: codeHash },
      orderBy: { createdAt: 'desc' },
      select: { id: true, expires: true },
    });

    if (!token) {
      return jsonError(400, 'INVALID_CODE', '인증번호가 올바르지 않습니다.');
    }

    if (token.expires.getTime() < Date.now()) {
      await prisma.verificationToken.deleteMany({ where: { identifier } });
      return jsonError(400, 'CODE_EXPIRED', '인증번호가 만료되었습니다.');
    }

    const nickname = await createUniqueNickname(email);
    const hashedPassword = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        phone,
        nickname,
        password: hashedPassword,
        signupMethod: 'EMAIL',
        isVerified: true,
      },
      select: {
        email: true,
        name: true,
      },
    });

    // consume register verification token (one-time use)
    await prisma.verificationToken.deleteMany({ where: { identifier } });

    return NextResponse.json(
      {
        status: 'success',
        data: {
          message: '회원가입이 완료되었습니다.',
          user,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('register v1 error:', error);
    return jsonError(500, 'SERVER_ERROR', '서버 오류가 발생했습니다.');
  }
}
