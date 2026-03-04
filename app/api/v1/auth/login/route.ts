import { randomBytes } from 'crypto';
import { compare } from 'bcryptjs';
import { encode } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { loginSchema } from '@/lib/validations/auth';

export const runtime = 'nodejs';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 5 * 60 * 1000;
const ATTEMPT_COOKIE_NAME = 'gcs_login_attempt';

type AttemptCookieState = {
  count: number;
  lockedUntil: number | null;
};

function mapMemberTypeToRole(memberType: number) {
  return memberType === 2 ? 'admin' : 'user';
}

function getDefaultAttemptState(): AttemptCookieState {
  return { count: 0, lockedUntil: null };
}

function normalizeAttemptState(value: unknown): AttemptCookieState {
  if (!value || typeof value !== 'object') return getDefaultAttemptState();

  const maybe = value as { count?: unknown; lockedUntil?: unknown };
  const count =
    typeof maybe.count === 'number' && Number.isFinite(maybe.count) && maybe.count > 0
      ? Math.min(Math.floor(maybe.count), MAX_FAILED_ATTEMPTS)
      : 0;
  const lockedUntil =
    typeof maybe.lockedUntil === 'number' && Number.isFinite(maybe.lockedUntil) && maybe.lockedUntil > 0
      ? Math.floor(maybe.lockedUntil)
      : null;

  return { count, lockedUntil };
}

function readAttemptState(request: NextRequest): AttemptCookieState {
  const raw = request.cookies.get(ATTEMPT_COOKIE_NAME)?.value;
  if (!raw) return getDefaultAttemptState();

  try {
    return normalizeAttemptState(JSON.parse(raw));
  } catch {
    return getDefaultAttemptState();
  }
}

function setAttemptStateCookie(response: NextResponse, state: AttemptCookieState) {
  if (state.count <= 0 && !state.lockedUntil) {
    response.cookies.delete(ATTEMPT_COOKIE_NAME);
    return;
  }

  response.cookies.set({
    name: ATTEMPT_COOKIE_NAME,
    value: JSON.stringify(state),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60,
  });
}

function getLockedUntilFromState(state: AttemptCookieState) {
  if (!state.lockedUntil) return null;
  const date = new Date(state.lockedUntil);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildErrorResponse(
  status: number,
  code: 'AUTH_FAILED' | 'ACCOUNT_LOCKED' | 'SERVER_ERROR',
  message: string,
  attemptState: AttemptCookieState
) {
  const lockedUntil = getLockedUntilFromState(attemptState);
  const response = NextResponse.json(
    {
      status: 'error',
      code,
      message,
      meta: {
        failedAttempts: Math.min(attemptState.count, MAX_FAILED_ATTEMPTS),
        maxAttempts: MAX_FAILED_ATTEMPTS,
        lockDurationMinutes: LOCK_DURATION_MS / 60000,
        lockedUntil: lockedUntil ? lockedUntil.toISOString() : null,
      },
    },
    { status }
  );

  setAttemptStateCookie(response, attemptState);
  return response;
}

function registerFailedAttempt(current: AttemptCookieState, nowMs: number): AttemptCookieState {
  const nextCount = Math.min((current.count ?? 0) + 1, MAX_FAILED_ATTEMPTS);
  const shouldLock = nextCount >= MAX_FAILED_ATTEMPTS;

  return {
    count: nextCount,
    lockedUntil: shouldLock ? nowMs + LOCK_DURATION_MS : null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const nowMs = Date.now();
    const now = new Date(nowMs);
    const rawCookieAttemptState = readAttemptState(request);
    const cookieAttemptState =
      rawCookieAttemptState.lockedUntil && rawCookieAttemptState.lockedUntil <= nowMs
        ? getDefaultAttemptState()
        : rawCookieAttemptState;

    if (cookieAttemptState.lockedUntil && cookieAttemptState.lockedUntil > nowMs) {
      return buildErrorResponse(
        403,
        'ACCOUNT_LOCKED',
        '아이디 또는 비밀번호가 일치하지 않습니다.',
        {
          count: MAX_FAILED_ATTEMPTS,
          lockedUntil: cookieAttemptState.lockedUntil,
        }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      const nextAttemptState = registerFailedAttempt(cookieAttemptState, nowMs);
      const isLocked = Boolean(nextAttemptState.lockedUntil && nextAttemptState.lockedUntil > nowMs);

      return buildErrorResponse(
        isLocked ? 403 : 401,
        isLocked ? 'ACCOUNT_LOCKED' : 'AUTH_FAILED',
        '아이디 또는 비밀번호가 일치하지 않습니다.',
        nextAttemptState
      );
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findFirst({ where: { email },
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
      const nextAttemptState = registerFailedAttempt(cookieAttemptState, nowMs);
      const isLocked = Boolean(nextAttemptState.lockedUntil && nextAttemptState.lockedUntil > nowMs);

      return buildErrorResponse(
        isLocked ? 403 : 401,
        isLocked ? 'ACCOUNT_LOCKED' : 'AUTH_FAILED',
        '아이디 또는 비밀번호가 일치하지 않습니다.',
        nextAttemptState
      );
    }

    if (user.lockedUntil && user.lockedUntil > now) {
      return buildErrorResponse(403, 'ACCOUNT_LOCKED', '아이디 또는 비밀번호가 일치하지 않습니다.', {
        count: MAX_FAILED_ATTEMPTS,
        lockedUntil: user.lockedUntil.getTime(),
      });
    }

    if (user.lockedUntil && user.lockedUntil <= now) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
    }

    const ok = await compare(password, user.password);

    if (!ok) {
      const nextUserAttempts = Math.min((user.failedLoginAttempts ?? 0) + 1, MAX_FAILED_ATTEMPTS);
      const shouldLock = nextUserAttempts >= MAX_FAILED_ATTEMPTS;
      const userLockedUntil = shouldLock ? new Date(nowMs + LOCK_DURATION_MS) : null;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: nextUserAttempts,
          lockedUntil: userLockedUntil,
        },
      });

      const nextAttemptState = registerFailedAttempt(cookieAttemptState, nowMs);
      const effectiveLockedUntil = userLockedUntil?.getTime() ?? nextAttemptState.lockedUntil;
      const isLocked = Boolean(effectiveLockedUntil && effectiveLockedUntil > nowMs);

      return buildErrorResponse(
        isLocked ? 403 : 401,
        isLocked ? 'ACCOUNT_LOCKED' : 'AUTH_FAILED',
        '아이디 또는 비밀번호가 일치하지 않습니다.',
        {
          count: Math.max(nextAttemptState.count, nextUserAttempts),
          lockedUntil: effectiveLockedUntil ?? null,
        }
      );
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
      return buildErrorResponse(500, 'SERVER_ERROR', '서버 내부 로직 오류', getDefaultAttemptState());
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

    const response = NextResponse.json(
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
        meta: {
          failedAttempts: 0,
          maxAttempts: MAX_FAILED_ATTEMPTS,
          lockDurationMinutes: LOCK_DURATION_MS / 60000,
          lockedUntil: null,
        },
      },
      { status: 200 }
    );

    setAttemptStateCookie(response, getDefaultAttemptState());
    return response;
  } catch (e) {
    console.error('v1 login error:', e);
    return buildErrorResponse(500, 'SERVER_ERROR', '서버 내부 로직 오류', getDefaultAttemptState());
  }
}
