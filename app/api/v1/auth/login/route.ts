import { NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { encode } from 'next-auth/jwt';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';
import { loginSchema } from '@/lib/validations/auth';

export const runtime = 'nodejs';

function mapMemberTypeToRole(memberType: number) {
  return memberType === 2 ? 'admin' : 'user';
}

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json(
    {
      status: 'error',
      code,
      message,
    },
    { status }
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(400, 'INVALID_INPUT', '이메일 형식이 잘못되었거나 필수 값이 누락됨');
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        memberType: true,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });

    // Always return AUTH_FAILED for non-existent users
    if (!user || !user.password) {
      return jsonError(401, 'AUTH_FAILED', '아이디 또는 비밀번호를 확인해주세요.');
    }

    const now = new Date();
    if (user.lockedUntil && user.lockedUntil > now) {
      return jsonError(403, 'ACCOUNT_LOCKED', '비밀번호 5회 오류 등으로 인한 계정 잠김');
    }

    const ok = await compare(password, user.password);

    if (!ok) {
      const nextAttempts = (user.failedLoginAttempts ?? 0) + 1;
      const shouldLock = nextAttempts >= 5;
      const lockedUntil = shouldLock ? new Date(Date.now() + 30 * 60 * 1000) : null; // 30m

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: nextAttempts,
          lockedUntil,
        },
      });

      if (shouldLock) {
        return jsonError(403, 'ACCOUNT_LOCKED', '비밀번호 5회 오류 등으로 인한 계정 잠김');
      }

      return jsonError(401, 'AUTH_FAILED', '아이디 또는 비밀번호를 확인해주세요.');
    }

    // Successful login: reset lock state
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return jsonError(500, 'SERVER_ERROR', '서버 내부 로직 오류');
    }

    // Access token (1 hour) - NextAuth JWT encoding for API compatibility
    const accessToken = await encode({
      secret,
      maxAge: 60 * 60,
      token: {
        id: user.id,
        sub: user.id,
        email: user.email,
        name: user.name,
        role: mapMemberTypeToRole(user.memberType),
      },
    });

    // Refresh token (2 weeks)
    const refreshToken = randomBytes(32).toString('hex');
    const refreshExpires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const refreshIdentifier = `refresh:${user.id}`;

    // Keep only one active refresh token per user (simple strategy)
    await prisma.verificationToken.deleteMany({
      where: { identifier: refreshIdentifier },
    });

    await prisma.verificationToken.create({
      data: {
        identifier: refreshIdentifier,
        token: refreshToken,
        expires: refreshExpires,
      },
    });

    return NextResponse.json(
      {
        status: 'success',
        data: {
          accessToken,
          refreshToken,
          user: {
            name: user.name,
            email: user.email,
          },
        },
      },
      { status: 200 }
    );
  } catch (e) {
    console.error('v1 login error:', e);
    return jsonError(500, 'SERVER_ERROR', '서버 내부 로직 오류');
  }
}

