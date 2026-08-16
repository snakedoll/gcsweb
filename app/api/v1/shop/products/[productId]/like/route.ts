import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { apiError } from '@/lib/api-response';

export async function POST(
    request: Request,
    { params }: { params: { productId: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return apiErrors.unauthorized('로그인이 필요합니다.');
        }

        const userId = session.user.id;
        const { productId } = params;

        // 이미 좋아요를 눌렀는지 확인
        const existingLike = await prisma.like.findFirst({
            where: { userId, productId },
        });

        if (existingLike) {
            // 좋아요 취소 (삭제)
            await prisma.$transaction([
                prisma.like.delete({ where: { id: existingLike.id } }),
                prisma.product.update({
                    where: { id: productId },
                    data: { likeCount: { decrement: 1 } }
                })
            ]);
            return NextResponse.json({ status: 'success', message: '좋아요 취소 완료', data: { isLiked: false } });
        } else {
            // 좋아요 추가 (생성)
            await prisma.$transaction([
                prisma.like.create({
                    data: { userId, productId },
                }),
                prisma.product.update({
                    where: { id: productId },
                    data: { likeCount: { increment: 1 } }
                })
            ]);
            return NextResponse.json({ status: 'success', message: '좋아요 추가 완료', data: { isLiked: true } });
        }

    } catch (error) {
        console.error('Like Toggle API Error:', error);
        return apiErrors.serverError('서버 에러가 발생했습니다.');
    }
}
