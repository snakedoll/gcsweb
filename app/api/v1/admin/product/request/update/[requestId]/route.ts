import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isNonEmptyString, jsonError, requireAdmin } from '../../../_utils';

/**
 * GET /api/v1/admin/product/request/update/[requestId]
 * 수정 요청 상세 조회
 */
export async function GET(
  _request: Request,
  { params }: { params: { requestId: string } }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const requestId = isNonEmptyString(params?.requestId) ? params.requestId.trim() : '';
    if (!requestId) {
      return jsonError(400, 'INVALID_INPUT', '필수 입력값 누락/형식 오류');
    }

    const repo = prisma as any;
    const row = await repo.productUpdateRequest.findFirst({
      where: { id: requestId, requestType: 1 },
      select: {
        id: true,
        productId: true,
        teamId: true,
        name: true,
        description: true,
        type: true,
        receiveMethod: true,
        price: true,
        goalAmount: true,
        salesStartDate: true,
        salesEndDate: true,
        productionStartDate: true,
        productionEndDate: true,
        deliveryStartDate: true,
        deliveryEndDate: true,
        pickupStartDate: true,
        pickupEndDate: true,
        pickupLocation: true,
        requestedAt: true,
        team: { select: { id: true, teamName: true } },
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            type: true,
            receiveMethod: true,
            price: true,
            goalAmount: true,
            currentAmount: true,
            likeCount: true,
            salesStartDate: true,
            salesEndDate: true,
          },
        },
        images: {
          orderBy: { createdAt: 'desc' as const },
          take: 1,
          select: {
            thumbnailImgUrl: true,
            detailImgUrl: true,
            noticeImgUrl: true,
          },
        },
        options: {
          orderBy: { optionName: 'asc' as const },
          select: {
            id: true,
            optionName: true,
            values: {
              orderBy: { value: 'asc' as const },
              select: {
                id: true,
                value: true,
                additionalPrice: true,
              },
            },
          },
        },
      },
    });

    if (!row) {
      return jsonError(404, 'UPDATE_REQUEST_NOT_FOUND', '유효하지 않은 수정 요청이거나 이미 처리된 요청입니다.');
    }

    const image = row.images?.[0] ?? null;

    return NextResponse.json({
      status: 'success',
      data: {
        request: {
          requestId: row.id,
          productId: row.productId,
          teamId: row.teamId,
          teamName: row.team?.teamName ?? '',
          name: row.name,
          description: row.description ?? '',
          type: row.type,
          receiveMethod: row.receiveMethod,
          price: row.price,
          goalAmount: row.goalAmount,
          salesStartDate: row.salesStartDate,
          salesEndDate: row.salesEndDate,
          productionStartDate: row.productionStartDate,
          productionEndDate: row.productionEndDate,
          deliveryStartDate: row.deliveryStartDate,
          deliveryEndDate: row.deliveryEndDate,
          pickupStartDate: row.pickupStartDate,
          pickupEndDate: row.pickupEndDate,
          pickupLocation: row.pickupLocation,
          requestedAt: row.requestedAt,
          thumbnailUrl: image?.thumbnailImgUrl ?? '',
          detailImageUrls: Array.isArray(image?.detailImgUrl) ? image?.detailImgUrl : [],
          noticeImgUrl: image?.noticeImgUrl ?? null,
          options: (row.options ?? []).map((option: any) => ({
            id: option.id,
            name: option.optionName,
            values: (option.values ?? []).map((value: any) => ({
              id: value.id,
              value: value.value,
              additionalPrice: value.additionalPrice,
            })),
          })),
          // 기존 상품 정보 (비교용)
          currentProduct: row.product ? {
            name: row.product.name,
            description: row.product.description,
            type: row.product.type,
            receiveMethod: row.product.receiveMethod,
            price: row.product.price,
            goalAmount: row.product.goalAmount,
            currentAmount: row.product.currentAmount,
            likeCount: row.product.likeCount,
            salesStartDate: row.product.salesStartDate,
            salesEndDate: row.product.salesEndDate,
          } : null,
        },
      },
    });
  } catch (error) {
    console.error('Admin update request detail error:', error);
    return jsonError(500, 'SERVER_ERROR', '서버 내부 오류가 발생했습니다.');
  }
}

/**
 * PATCH /api/v1/admin/product/request/update/[requestId]
 * 수정 요청 승인 또는 거부
 */
export async function PATCH(
  request: Request,
  { params }: { params: { requestId: string } }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const requestId = isNonEmptyString(params?.requestId) ? params.requestId.trim() : '';
    if (!requestId) {
      return jsonError(400, 'INVALID_INPUT', '필수 입력값 누락/형식 오류');
    }

    const body = await request.json().catch(() => ({}));
    const action = (body as any)?.action;
    if (action !== 'approve' && action !== 'reject') {
      return jsonError(400, 'INVALID_INPUT', 'action은 approve 또는 reject여야 합니다.');
    }

    const repo = prisma as any;

    const requestRow = await repo.productUpdateRequest.findFirst({
      where: { id: requestId, requestType: 1 },
      select: {
        id: true,
        productId: true,
        teamId: true,
        name: true,
        description: true,
        type: true,
        receiveMethod: true,
        price: true,
        goalAmount: true,
        salesStartDate: true,
        salesEndDate: true,
        productionStartDate: true,
        productionEndDate: true,
        deliveryStartDate: true,
        deliveryEndDate: true,
        pickupStartDate: true,
        pickupEndDate: true,
        pickupLocation: true,
        images: {
          orderBy: { createdAt: 'desc' as const },
          take: 1,
          select: {
            thumbnailImgUrl: true,
            detailImgUrl: true,
            noticeImgUrl: true,
          },
        },
        options: {
          orderBy: { optionName: 'asc' as const },
          select: {
            optionName: true,
            values: {
              orderBy: { value: 'asc' as const },
              select: {
                value: true,
                additionalPrice: true,
              },
            },
          },
        },
      },
    });

    if (!requestRow) {
      return jsonError(404, 'UPDATE_REQUEST_NOT_FOUND', '유효하지 않은 수정 요청이거나 이미 처리된 요청입니다.');
    }

    if (action === 'reject') {
      // 거부: 수정 요청만 삭제 (기존 상품은 그대로 유지)
      await prisma.$transaction(async (tx: any) => {
        await tx.productUpdateRequestOption.deleteMany({ where: { productUpdateRequestId: requestId } });
        await tx.productUpdateRequestImage.deleteMany({ where: { productUpdateRequestId: requestId } });
        await tx.productUpdateRequest.delete({ where: { id: requestId } });
      });

      return NextResponse.json({
        status: 'success',
        data: { action: 'reject', requestId },
      });
    }

    // 승인: 수정 요청 내용을 기존 상품에 반영
    const image = requestRow.images?.[0] ?? null;

    await prisma.$transaction(async (tx: any) => {
      // 상품 정보 업데이트
      await tx.product.update({
        where: { id: requestRow.productId },
        data: {
          teamId: requestRow.teamId,
          name: requestRow.name,
          description: requestRow.description,
          type: requestRow.type,
          receiveMethod: requestRow.receiveMethod,
          price: requestRow.price,
          goalAmount: requestRow.type === 0 ? requestRow.goalAmount : null,
          salesStartDate: requestRow.salesStartDate,
          salesEndDate: requestRow.salesEndDate,
          productionStartDate: requestRow.productionStartDate,
          productionEndDate: requestRow.productionEndDate,
          deliveryStartDate: requestRow.deliveryStartDate,
          deliveryEndDate: requestRow.deliveryEndDate,
          pickupStartDate: requestRow.pickupStartDate,
          pickupEndDate: requestRow.pickupEndDate,
          pickupLocation: requestRow.pickupLocation,
          isAdminApproved: true,
          isPublic: true,
          isHome: false,
        },
      });

      // 이미지 업데이트
      if (image) {
        await tx.productImage.deleteMany({ where: { productId: requestRow.productId } });
        await tx.productImage.create({
          data: {
            productId: requestRow.productId,
            thumbnailImgUrl: image.thumbnailImgUrl ?? '',
            detailImgUrl: image.detailImgUrl ?? [],
            noticeImgUrl: image.noticeImgUrl ?? '',
          },
        });
      }

      // 옵션 업데이트
      if (requestRow.options?.length) {
        await tx.productOption.deleteMany({ where: { productId: requestRow.productId } });
        for (const option of requestRow.options) {
          const createdOption = await tx.productOption.create({
            data: {
              productId: requestRow.productId,
              productName: requestRow.name,
              optionName: option.optionName,
            },
          });

          for (const val of option.values ?? []) {
            await tx.productOptionValue.create({
              data: {
                optionId: createdOption.id,
                productId: requestRow.productId,
                productName: requestRow.name,
                optionName: option.optionName,
                value: val.value,
                additionalPrice: val.additionalPrice,
              },
            });
          }
        }
      }

      // 수정 요청 삭제
      await tx.productUpdateRequestOption.deleteMany({ where: { productUpdateRequestId: requestId } });
      await tx.productUpdateRequestImage.deleteMany({ where: { productUpdateRequestId: requestId } });
      await tx.productUpdateRequest.delete({ where: { id: requestId } });
    });

    return NextResponse.json({
      status: 'success',
      data: {
        action: 'approve',
        productId: requestRow.productId,
        requestId,
      },
    });
  } catch (error) {
    console.error('Admin update request approve/reject error:', error);
    return jsonError(500, 'SERVER_ERROR', '서버 내부 오류가 발생했습니다.');
  }
}
