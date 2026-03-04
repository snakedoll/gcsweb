import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { normalizeImageUrl } from '@/lib/image-url';

type Body = {
  profileImageUrl?: string | null;
};

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        {
          status: 'error',
          code: 'UNAUTHORIZED',
          message: '토큰이 없거나 만료되어 접근할 수 없습니다.',
        },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as Body;

    if (!Object.prototype.hasOwnProperty.call(body, 'profileImageUrl')) {
      return NextResponse.json(
        {
          status: 'error',
          code: 'INVALID_INPUT',
          message: 'profileImageUrl 필드가 필요합니다.',
        },
        { status: 400 }
      );
    }

    const { profileImageUrl } = body;

    if (profileImageUrl !== null && typeof profileImageUrl !== 'string') {
      return NextResponse.json(
        {
          status: 'error',
          code: 'INVALID_INPUT',
          message: 'profileImageUrl은 문자열이거나 null이어야 합니다.',
        },
        { status: 400 }
      );
    }

    if (typeof profileImageUrl === 'string' && !profileImageUrl.trim().startsWith('/')) {
      // 간단한 URL 형식 검사
      try {
        // eslint-disable-next-line no-new
        new URL(profileImageUrl);
      } catch (e) {
        return NextResponse.json(
          {
            status: 'error',
            code: 'INVALID_INPUT',
            message: '올바른 URL 형식이 아닙니다.',
          },
          { status: 400 }
        );
      }
    }

    const normalizedProfileImageUrl =
      typeof profileImageUrl === 'string' ? normalizeImageUrl(profileImageUrl) : profileImageUrl;

    const updated = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        profileImage: normalizedProfileImageUrl ?? null,
      },
      select: { id: true, profileImage: true },
    });

    return NextResponse.json({
      status: 'success',
      data: {
        id: updated.id,
        profileImageUrl: normalizeImageUrl(updated.profileImage ?? null),
      },
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      {
        status: 'error',
        code: 'SERVER_ERROR',
        message: '프로필 변경 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
