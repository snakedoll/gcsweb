import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { normalizeImageUrl } from '@/lib/image-url';

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

function isValidProductId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && !/\s/.test(value);
}

export async function GET(
  _request: Request,
  { params }: { params: { productId: string } }
) {
  try {
    const productId = params?.productId;
    if (!isValidProductId(productId)) {
      return jsonError(400, 'INVALID_INPUT', 'productId 형식 오류');
    }

    const repo = prisma as any;

    const product = await repo.product.findFirst({
      where: {
        id: productId.trim(),
        isPublic: true,
        isAdminApproved: true,
      },
      select: {
        id: true,
        teamId: true,
        type: true,
        name: true,
        description: true,
        salesStartDate: true,
        salesEndDate: true,
        receiveMethod: true,
        productionStartDate: true,
        productionEndDate: true,
        deliveryStartDate: true,
        deliveryEndDate: true,
        pickupStartDate: true,
        pickupEndDate: true,
        pickupLocation: true,
        goalAmount: true,
        currentAmount: true,
        price: true,
        team: { select: { teamName: true } },
        images: {
          select: { thumbnailImgUrl: true, detailImgUrl: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
        options: {
          orderBy: { optionName: 'asc' },
          select: {
            optionName: true,
            values: {
              orderBy: { value: 'asc' },
              select: {
                value: true,
                additionalPrice: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      return jsonError(404, 'PRODUCT_NOT_FOUND', '존재하지 않거나 비공개/미승인 상품입니다.');
    }

    // 상세 조회 성공 시 조회수 즉시 증가
    await repo.product.update({
      where: { id: product.id },
      data: { viewCount: { increment: 1 } },
      select: { id: true },
    });

    let isLiked = false;
    let isInCart = false;

    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.email) {
        const user = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { id: true },
        });

        if (user) {
          const [liked, cartItem] = await Promise.all([
            prisma.like.findFirst({
              where: {
                userId: user.id,
                productId: product.id,
              },
              select: { id: true },
            }),
            prisma.cartItem.findFirst({
              where: {
                productId: product.id,
                cart: {
                  userId: user.id,
                },
              },
              select: { id: true },
            }),
          ]);

          isLiked = Boolean(liked);
          isInCart = Boolean(cartItem);
        }
      }
    } catch (e) {
      console.warn('shop product detail optional auth failed:', e);
      isLiked = false;
      isInCart = false;
    }

    const image = product.images?.[0];
    const thumbnailUrl = normalizeImageUrl(image?.thumbnailImgUrl ?? '') ?? '';
    const detailImageUrls = Array.isArray(image?.detailImgUrl)
      ? image.detailImgUrl
          .map((url) => normalizeImageUrl(url))
          .filter((url): url is string => typeof url === 'string' && url.length > 0)
      : [];

    return NextResponse.json({
      status: 'success',
      data: {
        product: {
          id: product.id,
          teamId: product.teamId,
          teamName: product.team?.teamName ?? '',
          type: product.type,
          name: product.name,
          description: product.description ?? '',
          thumbnailUrl,
          detailImageUrls,
          salesStartDate: product.salesStartDate,
          salesEndDate: product.salesEndDate,
          receiveMethod: product.receiveMethod,
          productionStartDate: product.type === 0 && product.receiveMethod === 0 ? product.productionStartDate : null,
          productionEndDate: product.type === 0 && product.receiveMethod === 0 ? product.productionEndDate : null,
          deliveryStartDate: product.type === 0 && product.receiveMethod === 0 ? product.deliveryStartDate : null,
          deliveryEndDate: product.type === 0 && product.receiveMethod === 0 ? product.deliveryEndDate : null,
          pickupStartDate: product.type === 0 && product.receiveMethod === 1 ? product.pickupStartDate : null,
          pickupEndDate: product.type === 0 && product.receiveMethod === 1 ? product.pickupEndDate : null,
          pickupLocation: product.type === 0 && product.receiveMethod === 1 ? product.pickupLocation : null,
          goalAmount: product.type === 0 ? product.goalAmount ?? null : null,
          currentAmount: product.type === 0 ? product.currentAmount ?? 0 : null,
          isLiked,
          isInCart,
          price: product.price,
          options: (product.options ?? []).map((option: any) => ({
            name: option.optionName,
            values: (option.values ?? []).map((value: any) => ({
              value: value.value,
              additionalPrice: value.additionalPrice,
            })),
          })),
        },
      },
    });
  } catch (error) {
    console.error('Shop product detail error:', error);
    return jsonError(500, 'SERVER_ERROR', '서버 내부 오류가 발생했습니다.');
  }
}

