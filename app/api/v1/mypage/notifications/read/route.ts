import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { apiError } from '@/lib/api-response';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiError(401, 'UNAUTHORIZED', '로그인이 필요한 서비스입니다.');
    }

    const { id } = await request.json();
    if (!id) {
      return apiError(400, 'BAD_REQUEST', '알림 ID가 필요합니다.');
    }

    const user = await prisma.user.findFirst({ where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return apiError(401, 'UNAUTHORIZED', '사용자를 찾을 수 없습니다.');
    }

    // Update the notification as read
    await prisma.notification.updateMany({
      where: {
        id: id,
        userId: user.id
      },
      data: { isRead: true },
    });


    return NextResponse.json({
      status: 'success',
      message: '알림이 읽음 처리되었습니다.',
    });
  } catch (error: any) {
    console.error('Mark notification read error:', error);
    return apiError(500, 'SERVER_ERROR', '알림 읽음 처리 실패');
  }
}
