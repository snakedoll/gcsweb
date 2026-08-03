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
      return apiError(401, 'UNAUTHORIZED', '로그인이 필요한 서비스입니다.');
    }

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
    const size = Math.max(1, Number(url.searchParams.get('size') ?? '20'));

    // 사용자 id 먼저 조회
    const user = await prisma.user.findFirst({ where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return apiError(401, 'UNAUTHORIZED', '사용자를 찾을 수 없습니다.');
    }

    const rows = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * size,
      take: size + 1,
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
        isRead: true,
        createdAt: true,
        linkUrl: true,
      },
    });

    let notifications = rows.map((r: any) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      content: r.content,
      isRead: Boolean(r.isRead),
      createdAt: r.createdAt,
      linkUrl: r.linkUrl ?? null,
    }));

    const hasNext = notifications.length > size;
    if (hasNext) notifications = notifications.slice(0, size);

    return NextResponse.json({
      status: 'success',
      data: {
        hasNext,
        notifications,
      },
    });
  } catch (error: any) {
    console.error('Notifications list error:', error);
    return apiError(500, 'SERVER_ERROR', '알림 목록을 불러오지 못했습니다.');
  }
}
