import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

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

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        nickname: true,
        profileImage: true,
        memberType: true,
        notificationCount: true,
        likeCount: true,
      },
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

    // Scrap 모델이 DB에 존재하면 카운트, 없으면 0 반환
    let scrapCount = 0;
    try {
      const repo: any = prisma as any;
      if (repo.scrap && typeof repo.scrap.count === 'function') {
        scrapCount = await repo.scrap.count({ where: { userId: user.id } });
      }
    } catch (e) {
      scrapCount = 0;
    }
    const likeCount = user.likeCount ?? 0;
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
        profileImageUrl: user.profileImage ?? null,
        memberType: user.memberType,
        role,
        notificationCount: user.notificationCount ?? 0,
        likeCount,
        scrapCount,
      },
    });
  } catch (error: any) {
    console.error('Mypage info error:', error);
    return NextResponse.json(
      {
        status: 'error',
        code: 'SERVER_ERROR',
        message: '서버 내부 로직 오류',
      },
      { status: 500 }
    );
  }
}
