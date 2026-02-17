import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function isEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const email = body?.email ?? '';
    if (!isEmail(email)) {
      return NextResponse.json(
        { status: 'error', code: 'INVALID_FORMAT', message: '올바른 이메일 형식이 아닙니다.' },
        { status: 400 }
      );
    }
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { status: 'error', code: 'EMAIL_EXISTS', message: '사용중인 이메일 입니다.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ status: 'ok', available: true });
  } catch {
    return NextResponse.json(
      { status: 'error', message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
