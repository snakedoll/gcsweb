import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { apiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiErrors.unauthorized('로그인이 필요한 서비스입니다.');
    }

    const user = await prisma.user.findFirst({ where: { email: session.user.email },
      select: {
        id: true,
        nickname: true,
        email: true,
        name: true,
        phone: true,
        profileImage: true,
        memberType: true,
        _count: {
          select: {
            likes: true,
            scraps: true,
          },
        },
      },
    });

    if (!user) {
      return apiErrors.unauthorized('사용자를 찾을 수 없습니다.');
    }

    // 읽지 않은 알림만 카운트
    const unreadNotificationCount = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    });

    const roleMap: Record<number, string> = {
      0: 'GENERAL',
      1: 'MAJOR',
      2: 'ADMIN',
    };

    const role = roleMap[Number(user.memberType)] ?? 'GENERAL';

    return NextResponse.json({
      status: 'success',
      data: {
        userId: user.id,
        name: user.nickname ?? '',
        user: {
          name: user.name ?? '',
          phone: user.phone ?? '',
          email: user.email ?? '',
        },
        profileImageUrl: user.profileImage ?? null,
        memberType: user.memberType,
        role,
        notificationCount: unreadNotificationCount,
        likeCount: user._count.likes,
        scrapCount: user._count.scraps,
      },
    });
  } catch (error: any) {
    console.error('Mypage info error:', error);
    return apiErrors.serverError('서버 내부 로직 오류');
  }
}

