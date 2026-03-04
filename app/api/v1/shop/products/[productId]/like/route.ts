import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export async function POST(
    request: Request,
    { params }: { params: { productId: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ status: 'error', code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' }, { status: 401 });
        }

        const userId = session.user.id;
        const { productId } = params;

        // 이미 좋아요를 눌렀는지 확인
        const existingLike = await prisma.like.findFirst({
            where: { userId, productId },
        });

        if (existingLike) {
            // 좋아요 취소 (삭제)
            await prisma.like.delete({ where: { id: existingLike.id } });
            return NextResponse.json({ status: 'success', message: '좋아요 취소 완료', data: { isLiked: false } });
        } else {
            // 좋아요 추가 (생성)
            await prisma.like.create({
                data: { userId, productId },
            });
            return NextResponse.json({ status: 'success', message: '좋아요 추가 완료', data: { isLiked: true } });
        }

    } catch (error) {
        console.error('Like Toggle API Error:', error);
        return NextResponse.json({ status: 'error', code: 'SERVER_ERROR', message: '서버 에러가 발생했습니다.' }, { status: 500 });
    }
}
