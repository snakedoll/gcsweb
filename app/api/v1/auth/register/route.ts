import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json(
    { status: 'error', code, message },
    { status }
  );
}

function isEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isStrongPassword(value: unknown): value is string {
  // Spec: letters + numbers, 8+; allow special chars
  return typeof value === 'string' && value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

function normalizeNicknameBase(email: string) {
  const local = email.split('@')[0] ?? 'user';
  const cleaned = local.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
  return cleaned.length >= 2 ? cleaned : `user${cleaned}`;
}

async function createUniqueNickname(email: string) {
  const base = normalizeNicknameBase(email);

  // try base first, then base + 4-digit suffix
  const candidates = [base, ...Array.from({ length: 9 }, (_, i) => `${base}${String(i + 1).padStart(4, '0')}`)];

  for (const nick of candidates) {
    const exists = await prisma.user.findUnique({ where: { nickname: nick }, select: { id: true } });
    if (!exists) return nick;
  }

  // fallback: base + random
  return `${base}${Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0')}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return jsonError(400, 'INVALID_INPUT', '필수 정보가 누락되었습니다.');
    }

    const name = (body as any).name;
    const phone = (body as any).phone;
    const email = (body as any).email;
    const password = (body as any).password;
    const confirmPassword = (body as any).confirmPassword;

    // Required checks (missing)
    if (!name || !phone || !email || !password || !confirmPassword) {
      return jsonError(400, 'INVALID_INPUT', '필수 정보가 누락되었습니다.');
    }

    // Email format
    if (!isEmail(email)) {
      return jsonError(400, 'INVALID_FORMAT', '올바른 이메일 형식이 아닙니다.');
    }

    // Password rule
    if (!isStrongPassword(password)) {
      return jsonError(400, 'WEAK_PASSWORD', '비밀번호 보안 규칙에 미달합니다.');
    }

    // Confirm mismatch
    if (password !== confirmPassword) {
      return jsonError(400, 'PASSWORD_MISMATCH', '비밀번호가 일치하지 않습니다.');
    }

    // Email exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return jsonError(409, 'EMAIL_EXISTS', '이미 사용 중인 이메일입니다.');
    }

    const hashedPassword = await hash(password, 12);
    const nickname = await createUniqueNickname(email);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        phone,
        nickname,
        password: hashedPassword,
      },
      select: {
        email: true,
        name: true,
      },
    });

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
  } catch (e) {
    console.error('v1 register error:', e);
    return jsonError(500, 'SERVER_ERROR', '서버 오류 발생.');
  }
}

