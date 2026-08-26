import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { apiError, apiErrors } from '@/lib/api-response';

export async function POST(
    request: Request,
    { params }: { params: { projectId: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return apiErrors.unauthorized('로그인이 필요합니다.');
        }

        const userId = session.user.id;
        const { projectId } = params;

        // 이미 스크랩 했는지 확인
        const existingScrap = await prisma.scrap.findFirst({
            where: { userId, projectId },
        });

        if (existingScrap) {
            // 스크랩 취소 (삭제)
            await prisma.scrap.delete({ where: { id: existingScrap.id } });
            return NextResponse.json({ status: 'success', message: '스크랩 취소 완료', data: { isScraped: false } });
        } else {
            // 스크랩 추가 (생성)
            await prisma.scrap.create({
                data: { userId, projectId },
            });
            return NextResponse.json({ status: 'success', message: '스크랩 추가 완료', data: { isScraped: true } });
        }

    } catch (error) {
        console.error('Scrap Toggle API Error:', error);
        return apiErrors.serverError('서버 에러가 발생했습니다.');
    }
}
