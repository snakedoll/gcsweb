import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        {
          status: 'error',
          code: 'UNAUTHORIZED',
          message: '로그인이 필요한 서비스입니다.',
        },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
    const size = Math.max(1, Number(url.searchParams.get('size') ?? '20'));

    // 사용자 id 먼저 조회
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        {
          status: 'error',
          code: 'UNAUTHORIZED',
          message: '사용자를 찾을 수 없습니다.',
        },
        { status: 401 }
      );
    }

    // Prisma schema may not include a Notification model. Try to query if available,
    // otherwise return empty list.
    let notifications: any[] = [];
    try {
      const repo: any = prisma as any;
      if (repo.notification && typeof repo.notification.findMany === 'function') {
        const rows = await repo.notification.findMany({
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

        notifications = rows.map((r: any) => ({
          id: r.id,
          type: r.type,
          title: r.title,
          content: r.content,
          isRead: Boolean(r.isRead),
          createdAt: r.createdAt,
          linkUrl: r.linkUrl ?? null,
        }));
      }
    } catch (e) {
      // 모델이 없거나 쿼리 실패 시 빈 배열으로 처리
      console.warn('Notification query skipped or failed:', e);
      notifications = [];
    }

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
    return NextResponse.json(
      {
        status: 'error',
        code: 'SERVER_ERROR',
        message: '알림 목록을 불러오지 못했습니다.',
      },
      { status: 500 }
    );
  }
}
