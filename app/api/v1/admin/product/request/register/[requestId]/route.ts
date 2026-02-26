import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  isNonEmptyString,
  isNonNegativeInt,
  jsonError,
  parseAdminOptionsInput,
  parseDateTime,
  requireAdmin,
} from '../../../_utils';

function validRange(start: Date | null, end: Date | null) {
  return !!start && !!end && start.getTime() <= end.getTime();
}

function trimStringArray(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  const values = input
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean);
  return values.length === input.length && values.length > 0 ? values : null;
}

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
      where: { id: requestId, requestType: 0 },
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
        team: { select: { id: true, teamName: true } },
        images: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            thumbnailImgUrl: true,
            detailImgUrl: true,
            noticeImgUrl: true,
          },
        },
        options: {
          orderBy: { optionName: 'asc' },
          select: {
            id: true,
            optionName: true,
            values: {
              orderBy: { value: 'asc' },
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
      return jsonError(404, 'REGISTER_REQUEST_NOT_FOUND', '유효하지 않은 등록 요청이거나 이미 처리된 요청입니다.');
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
        },
      },
    });
  } catch (error) {
    console.error('Admin register request detail error:', error);
    return jsonError(500, 'SERVER_ERROR', '서버 내부 오류가 발생했습니다.');
  }
}

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
      return jsonError(400, 'INVALID_INPUT', '필수 입력값 누락/형식 오류');
    }

    const repo = prisma as any;

    const requestRow = await repo.productUpdateRequest.findFirst({
      where: { id: requestId, requestType: 0 },
      select: {
        id: true,
        productId: true,
        product: {
          select: {
            id: true,
            currentAmount: true,
            likeCount: true,
          },
        },
      },
    });

    if (!requestRow) {
      return jsonError(404, 'REGISTER_REQUEST_NOT_FOUND', '유효하지 않은 등록 요청이거나 이미 처리된 요청입니다.');
    }

    if (!requestRow.product) {
      return jsonError(404, 'PRODUCT_NOT_FOUND', '요청에 연결된 사전 생성 Product가 없습니다.');
    }

    if (action === 'reject') {
      await prisma.$transaction(async (tx) => {
        await tx.productUpdateRequest.delete({ where: { id: requestId } });
        await tx.product.delete({ where: { id: requestRow.productId } });
      });

      return NextResponse.json({
        status: 'success',
        data: {
          action: 'reject',
          requestId,
        },
      });
    }

    const {
      teamId,
      name,
      description,
      type,
      receiveMethod,
      salesStartDate,
      salesEndDate,
      thumbnailUrl,
      detailImageUrls,
      noticeImgUrl,
      goalAmount,
      productionStartDate,
      productionEndDate,
      deliveryStartDate,
      deliveryEndDate,
      pickupStartDate,
      pickupEndDate,
      pickupLocation,
      price,
      options,
      isPublic,
    } = body as any;

    const trimmedDetails = trimStringArray(detailImageUrls);
    if (
      !isNonEmptyString(teamId) ||
      !isNonEmptyString(name) ||
      typeof description !== 'string' ||
      ![0, 1, 2].includes(type) ||
      ![0, 1].includes(receiveMethod) ||
      !isNonEmptyString(thumbnailUrl) ||
      !trimmedDetails ||
      typeof isPublic !== 'boolean' ||
      !isNonNegativeInt(price)
    ) {
      return jsonError(400, 'INVALID_INPUT', '필수 입력값 누락/형식 오류');
    }

    if (!isNonEmptyString(noticeImgUrl)) {
      return jsonError(400, 'NOTICE_IMAGE_REQUIRED', '상품 정보 고시 이미지는 등록 승인 시 필수입니다.');
    }

    const parsedOptions = parseAdminOptionsInput(options);
    if (!parsedOptions.ok) {
      return jsonError(400, 'INVALID_OPTION_INPUT', '옵션 구조/값 형식 오류');
    }

    const salesStart = parseDateTime(salesStartDate);
    const salesEnd = parseDateTime(salesEndDate);
    if (!validRange(salesStart, salesEnd)) {
      return jsonError(400, 'INVALID_DATE_RANGE', '판매기간/제작기간/배송기간/수령기간 범위 오류');
    }

    let resolvedGoalAmount: number | null = null;
    let resolvedProductionStart: Date | null = null;
    let resolvedProductionEnd: Date | null = null;
    let resolvedDeliveryStart: Date | null = null;
    let resolvedDeliveryEnd: Date | null = null;
    let resolvedPickupStart: Date | null = null;
    let resolvedPickupEnd: Date | null = null;
    let resolvedPickupLocation: string | null = null;

    if (type === 0) {
      if (!isNonNegativeInt(goalAmount)) {
        return jsonError(400, 'INVALID_INPUT', '필수 입력값 누락/형식 오류');
      }
      resolvedGoalAmount = goalAmount;

      if (receiveMethod === 0) {
        resolvedProductionStart = parseDateTime(productionStartDate);
        resolvedProductionEnd = parseDateTime(productionEndDate);
        resolvedDeliveryStart = parseDateTime(deliveryStartDate);
        resolvedDeliveryEnd = parseDateTime(deliveryEndDate);

        if (!validRange(resolvedProductionStart, resolvedProductionEnd) || !validRange(resolvedDeliveryStart, resolvedDeliveryEnd)) {
          return jsonError(400, 'INVALID_DATE_RANGE', '판매기간/제작기간/배송기간/수령기간 범위 오류');
        }
      } else {
        resolvedPickupStart = parseDateTime(pickupStartDate);
        resolvedPickupEnd = parseDateTime(pickupEndDate);
        resolvedPickupLocation = isNonEmptyString(pickupLocation) ? pickupLocation.trim() : null;
        if (!validRange(resolvedPickupStart, resolvedPickupEnd) || !resolvedPickupLocation) {
          return jsonError(400, 'INVALID_DATE_RANGE', '판매기간/제작기간/배송기간/수령기간 범위 오류');
        }
      }
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId.trim() },
      select: { id: true, teamName: true },
    });
    if (!team) {
      return jsonError(400, 'INVALID_INPUT', '필수 입력값 누락/형식 오류');
    }

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: requestRow.productId },
        data: {
          teamId: team.id,
          name: name.trim(),
          description: description.trim(),
          type,
          receiveMethod,
          price,
          goalAmount: type === 0 ? resolvedGoalAmount : null,
          salesStartDate: salesStart!,
          salesEndDate: salesEnd!,
          productionStartDate: type === 0 && receiveMethod === 0 ? resolvedProductionStart : null,
          productionEndDate: type === 0 && receiveMethod === 0 ? resolvedProductionEnd : null,
          deliveryStartDate: type === 0 && receiveMethod === 0 ? resolvedDeliveryStart : null,
          deliveryEndDate: type === 0 && receiveMethod === 0 ? resolvedDeliveryEnd : null,
          pickupStartDate: type === 0 && receiveMethod === 1 ? resolvedPickupStart : null,
          pickupEndDate: type === 0 && receiveMethod === 1 ? resolvedPickupEnd : null,
          pickupLocation: type === 0 && receiveMethod === 1 ? resolvedPickupLocation : null,
          isAdminApproved: true,
          isPublic,
          isHome: false,
        },
      });

      await tx.productImage.deleteMany({ where: { productId: requestRow.productId } });
      await tx.productImage.create({
        data: {
          productId: requestRow.productId,
          thumbnailImgUrl: thumbnailUrl.trim(),
          detailImgUrl: trimmedDetails,
          noticeImgUrl: noticeImgUrl.trim(),
        },
      });

      await tx.productOption.deleteMany({ where: { productId: requestRow.productId } });
      for (const option of parsedOptions.value) {
        const createdOption = await tx.productOption.create({
          data: {
            productId: requestRow.productId,
            optionName: option.name,
          },
        });

        for (const value of option.values) {
          await tx.productOptionValue.create({
            data: {
              optionId: createdOption.id,
              value: value.value,
              additionalPrice: value.additionalPrice,
            },
          });
        }
      }

      // 요청본도 관리자 최종 입력값으로 맞춘 뒤, 처리 완료 후 삭제한다.
      await tx.productUpdateRequest.update({
        where: { id: requestId },
        data: {
          teamId: team.id,
          name: name.trim(),
          description: description.trim(),
          type,
          receiveMethod,
          price,
          goalAmount: type === 0 ? resolvedGoalAmount : null,
          salesStartDate: salesStart!,
          salesEndDate: salesEnd!,
          productionStartDate: type === 0 && receiveMethod === 0 ? resolvedProductionStart : null,
          productionEndDate: type === 0 && receiveMethod === 0 ? resolvedProductionEnd : null,
          deliveryStartDate: type === 0 && receiveMethod === 0 ? resolvedDeliveryStart : null,
          deliveryEndDate: type === 0 && receiveMethod === 0 ? resolvedDeliveryEnd : null,
          pickupStartDate: type === 0 && receiveMethod === 1 ? resolvedPickupStart : null,
          pickupEndDate: type === 0 && receiveMethod === 1 ? resolvedPickupEnd : null,
          pickupLocation: type === 0 && receiveMethod === 1 ? resolvedPickupLocation : null,
        },
      });

      await tx.productUpdateRequestImage.deleteMany({ where: { productUpdateRequestId: requestId } });
      await tx.productUpdateRequestImage.create({
        data: {
          productUpdateRequestId: requestId,
          thumbnailImgUrl: thumbnailUrl.trim(),
          detailImgUrl: trimmedDetails,
          noticeImgUrl: noticeImgUrl.trim(),
        },
      });

      await tx.productUpdateRequestOption.deleteMany({ where: { productUpdateRequestId: requestId } });
      for (const option of parsedOptions.value) {
        const createdReqOption = await tx.productUpdateRequestOption.create({
          data: {
            productUpdateRequestId: requestId,
            optionName: option.name,
          },
        });

        for (const value of option.values) {
          await tx.productUpdateRequestOptionValue.create({
            data: {
              optionId: createdReqOption.id,
              value: value.value,
              additionalPrice: value.additionalPrice,
            },
          });
        }
      }
    });

    const approvedProduct = await repo.product.findUnique({
      where: { id: requestRow.productId },
      select: {
        id: true,
        teamId: true,
        type: true,
        name: true,
        description: true,
        receiveMethod: true,
        price: true,
        goalAmount: true,
        currentAmount: true,
        likeCount: true,
        salesStartDate: true,
        salesEndDate: true,
        productionStartDate: true,
        productionEndDate: true,
        deliveryStartDate: true,
        deliveryEndDate: true,
        pickupStartDate: true,
        pickupEndDate: true,
        pickupLocation: true,
        isAdminApproved: true,
        isPublic: true,
        isHome: true,
        updatedAt: true,
        team: { select: { teamName: true } },
      },
    });

    if (!approvedProduct) {
      return jsonError(404, 'PRODUCT_NOT_FOUND', '요청에 연결된 사전 생성 Product가 없습니다.');
    }

    await prisma.productUpdateRequest.delete({ where: { id: requestId } });

    return NextResponse.json({
      status: 'success',
      data: {
        action: 'approve',
        product: {
          id: approvedProduct.id,
          teamId: approvedProduct.teamId,
          teamName: approvedProduct.team?.teamName ?? '',
          type: approvedProduct.type,
          name: approvedProduct.name,
          description: approvedProduct.description ?? '',
          receiveMethod: approvedProduct.receiveMethod,
          price: approvedProduct.price,
          goalAmount: approvedProduct.type === 0 ? (approvedProduct.goalAmount ?? null) : null,
          currentAmount: approvedProduct.currentAmount ?? 0,
          likeCount: approvedProduct.likeCount ?? 0,
          thumbnailUrl: thumbnailUrl.trim(),
          detailImageUrls: trimmedDetails,
          noticeImgUrl: noticeImgUrl.trim(),
          salesStartDate: approvedProduct.salesStartDate,
          salesEndDate: approvedProduct.salesEndDate,
          productionStartDate: approvedProduct.productionStartDate,
          productionEndDate: approvedProduct.productionEndDate,
          deliveryStartDate: approvedProduct.deliveryStartDate,
          deliveryEndDate: approvedProduct.deliveryEndDate,
          pickupStartDate: approvedProduct.pickupStartDate,
          pickupEndDate: approvedProduct.pickupEndDate,
          pickupLocation: approvedProduct.pickupLocation,
          options: parsedOptions.value.map((opt) => ({
            name: opt.name,
            values: opt.values.map((v) => ({
              value: v.value,
              additionalPrice: v.additionalPrice,
            })),
          })),
          isAdminApproved: Boolean(approvedProduct.isAdminApproved),
          isPublic: Boolean(approvedProduct.isPublic),
          isHome: Boolean(approvedProduct.isHome),
          updatedAt: approvedProduct.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error('Admin register request approve/reject error:', error);
    return jsonError(500, 'SERVER_ERROR', '서버 내부 오류가 발생했습니다.');
  }
}
