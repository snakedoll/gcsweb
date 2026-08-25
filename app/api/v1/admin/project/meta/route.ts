import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { apiError as errorResponse } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return errorResponse(401, 'UNAUTHORIZED', '인증이 필요합니다.');
    }

    const adminUser = await prisma.user.findFirst({ where: { email: session.user.email },
      select: { memberType: true },
    });

    if (!adminUser || Number(adminUser.memberType) !== 2) {
      return errorResponse(403, 'FORBIDDEN', '관리자 권한이 필요합니다.');
    }

    const repo = prisma as any;

    const [teams, years, categories] = await Promise.all([
      repo.team.findMany({
        orderBy: { createdAt: 'desc' },
        select: { id: true, teamName: true },
      }),
      repo.projectYear.findMany({
        orderBy: { year: 'desc' },
        select: { id: true, year: true },
      }),
      repo.projectCategory.findMany({
        orderBy: { category: 'asc' },
        select: { id: true, category: true },
      }),
    ]);

    return NextResponse.json({
      status: 'success',
      data: {
        teams: teams.map((team: any) => ({ id: team.id, label: team.teamName })),
        years: years.map((year: any) => ({ id: year.id, label: String(year.year) })),
        categories: categories.map((category: any) => ({ id: category.id, label: category.category })),
      },
    });
  } catch (error) {
    console.error('Admin project meta error:', error);
    return errorResponse(500, 'SERVER_ERROR', '서버 오류가 발생했습니다.');
  }
}
