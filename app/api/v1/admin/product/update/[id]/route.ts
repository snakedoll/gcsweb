import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { normalizeImageUrl } from '@/lib/image-url';
import {
  isNonEmptyString,
  isNonNegativeInt,
  jsonError,
  parseAdminOptionsInput,
  parseDateTime,
  requireAdmin,
} from '../../_utils';

function validRange(start: Date | null, end: Date | null) {
  return !!start && !!end && start.getTime() <= end.getTime();
}

function hasOwn(obj: unknown, key: string) {
  return !!obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, key);
}

function trimStringArray(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  const values = input
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean);
  return values.length === input.length && values.length > 0 ? values : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const productId = isNonEmptyString(params?.id) ? params.id.trim() : '';
    if (!productId) {
      return jsonError(400, 'INVALID_INPUT', '필수 입력값 누락 또는 타입/형식 오류');
    }

    const body = await request.json().catch(() => ({}));

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
      price,
      goalAmount,
      productionStartDate,
      productionEndDate,
      deliveryStartDate,
      deliveryEndDate,
      pickupStartDate,
      pickupEndDate,
      pickupLocation,
      options,
      updatedAt,
    } = body as any;

    const parsedOptions = parseAdminOptionsInput(options);
    if (!parsedOptions.ok) {
      return jsonError(400, 'INVALID_OPTION_INPUT', '옵션 구조 오류(중복 옵션명/중복 옵션값/추가금액 음수 등)');
    }

    const parsedDetailImageUrls = trimStringArray(detailImageUrls);
    const parsedUpdatedAt = parseDateTime(updatedAt);
    const parsedSalesStartDate = parseDateTime(salesStartDate);
    const parsedSalesEndDate = parseDateTime(salesEndDate);

    if (
      !isNonEmptyString(teamId) ||
      !isNonEmptyString(name) ||
      !isNonEmptyString(description) ||
      !isNonNegativeInt(type) ||
      ![0, 1, 2].includes(type) ||
      !isNonEmptyString(thumbnailUrl) ||
      !parsedDetailImageUrls ||
      !isNonEmptyString(noticeImgUrl) ||
      !isNonNegativeInt(price) ||
      !parsedUpdatedAt ||
      !validRange(parsedSalesStartDate, parsedSalesEndDate)
    ) {
      return jsonError(400, 'INVALID_INPUT', '필수 입력값 누락 또는 타입/형식 오류');
    }

    const step2Keys = [
      'goalAmount',
      'productionStartDate',
      'productionEndDate',
      'deliveryStartDate',
      'deliveryEndDate',
      'pickupStartDate',
      'pickupEndDate',
      'pickupLocation',
    ];

    let resolvedReceiveMethod = 0;
    let resolvedGoalAmount: number | null = null;
    let resolvedProductionStartDate: Date | null = null;
    let resolvedProductionEndDate: Date | null = null;
    let resolvedDeliveryStartDate: Date | null = null;
    let resolvedDeliveryEndDate: Date | null = null;
    let resolvedPickupStartDate: Date | null = null;
    let resolvedPickupEndDate: Date | null = null;
    let resolvedPickupLocation: string | null = null;

    if (type === 0) {
      if (!isNonNegativeInt(receiveMethod) || ![0, 1].includes(receiveMethod)) {
        return jsonError(400, 'INVALID_INPUT', '필수 입력값 누락 또는 타입/형식 오류');
      }
      if (!isNonNegativeInt(goalAmount)) {
        return jsonError(400, 'INVALID_INPUT', '필수 입력값 누락 또는 타입/형식 오류');
      }

      resolvedReceiveMethod = receiveMethod;
      resolvedGoalAmount = goalAmount;

      if (receiveMethod === 0) {
        resolvedProductionStartDate = parseDateTime(productionStartDate);
        resolvedProductionEndDate = parseDateTime(productionEndDate);
        resolvedDeliveryStartDate = parseDateTime(deliveryStartDate);
        resolvedDeliveryEndDate = parseDateTime(deliveryEndDate);

        if (!validRange(resolvedProductionStartDate, resolvedProductionEndDate) || !validRange(resolvedDeliveryStartDate, resolvedDeliveryEndDate)) {
          return jsonError(400, 'INVALID_DATE_RANGE', '판매/제작/배송/수령 기간 범위 오류');
        }
      }

      if (receiveMethod === 1) {
        resolvedPickupStartDate = parseDateTime(pickupStartDate);
        resolvedPickupEndDate = parseDateTime(pickupEndDate);
        resolvedPickupLocation = isNonEmptyString(pickupLocation) ? pickupLocation.trim() : null;

        if (!validRange(resolvedPickupStartDate, resolvedPickupEndDate) || !resolvedPickupLocation) {
          return jsonError(400, 'INVALID_DATE_RANGE', '판매/제작/배송/수령 기간 범위 오류');
        }
      }
    } else if (type === 1) {
      if (receiveMethod !== 1) {
        return jsonError(400, 'INVALID_INPUT', '필수 입력값 누락 또는 타입/형식 오류');
      }
      if (step2Keys.some((key) => hasOwn(body, key))) {
        return jsonError(400, 'INVALID_INPUT', '필수 입력값 누락 또는 타입/형식 오류');
      }
      resolvedReceiveMethod = 1;
    } else {
      if (receiveMethod !== null) {
        return jsonError(400, 'INVALID_INPUT', '필수 입력값 누락 또는 타입/형식 오류');
      }
      if (step2Keys.some((key) => hasOwn(body, key))) {
        return jsonError(400, 'INVALID_INPUT', '필수 입력값 누락 또는 타입/형식 오류');
      }
      // PartnerUp은 명세상 수령방식 null 고정이지만 DB 스키마는 Int non-null.
      resolvedReceiveMethod = 0;
    }

    const normalizedThumbnailUrl = normalizeImageUrl(thumbnailUrl.trim());
    const normalizedNoticeImgUrl = normalizeImageUrl(noticeImgUrl.trim());
    const normalizedDetailImageUrls = parsedDetailImageUrls
      .map((url) => normalizeImageUrl(url))
      .filter((url): url is string => typeof url === 'string' && url.trim().length > 0);

    if (!normalizedThumbnailUrl || !normalizedNoticeImgUrl || normalizedDetailImageUrls.length === 0) {
      return jsonError(400, 'INVALID_INPUT', '필수 입력값 누락 또는 타입/형식 오류');
    }

    const [team, product] = await Promise.all([
      prisma.team.findUnique({
        where: { id: teamId.trim() },
        select: { id: true },
      }),
      prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          updatedAt: true,
          isHome: true,
          isAdminApproved: true,
          isPublic: true,
        },
      }),
    ]);

    if (!team || !product) {
      return jsonError(404, 'NOT_FOUND', '상품 또는 판매팀을 찾을 수 없음');
    }

    if (product.updatedAt.getTime() !== parsedUpdatedAt.getTime()) {
      return jsonError(409, 'CONFLICT', '이미 다른 변경사항이 반영되었습니다. 새로고침 후 다시 시도해주세요.');
    }

    const safeName = name.trim();
    const safeDescription = description.trim();

    const updatedProduct = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: productId },
        data: {
          teamId: team.id,
          name: safeName,
          description: safeDescription,
          type,
          receiveMethod: resolvedReceiveMethod,
          salesStartDate: parsedSalesStartDate!,
          salesEndDate: parsedSalesEndDate!,
          price,
          goalAmount: type === 0 ? resolvedGoalAmount : null,
          productionStartDate: type === 0 && resolvedReceiveMethod === 0 ? resolvedProductionStartDate : null,
          productionEndDate: type === 0 && resolvedReceiveMethod === 0 ? resolvedProductionEndDate : null,
          deliveryStartDate: type === 0 && resolvedReceiveMethod === 0 ? resolvedDeliveryStartDate : null,
          deliveryEndDate: type === 0 && resolvedReceiveMethod === 0 ? resolvedDeliveryEndDate : null,
          pickupStartDate: type === 0 && resolvedReceiveMethod === 1 ? resolvedPickupStartDate : null,
          pickupEndDate: type === 0 && resolvedReceiveMethod === 1 ? resolvedPickupEndDate : null,
          pickupLocation: type === 0 && resolvedReceiveMethod === 1 ? resolvedPickupLocation : null,
        },
      });

      await tx.productImage.deleteMany({ where: { productId: updated.id } });
      await tx.productImage.create({
        data: {
          productId: updated.id,
          thumbnailImgUrl: normalizedThumbnailUrl,
          detailImgUrl: normalizedDetailImageUrls,
          noticeImgUrl: normalizedNoticeImgUrl,
        },
      });

      await tx.productOption.deleteMany({ where: { productId: updated.id } });
      for (const option of parsedOptions.value) {
        const createdOption = await tx.productOption.create({
          data: {
            productId: updated.id,
            productName: safeName,
            optionName: option.name,
          },
        });

        for (const value of option.values) {
          await tx.productOptionValue.create({
            data: {
              optionId: createdOption.id,
              productId: updated.id,
              productName: safeName,
              optionName: option.name,
              value: value.value,
              additionalPrice: value.additionalPrice,
            },
          });
        }
      }

      return updated;
    });

    return NextResponse.json({
      status: 'success',
      data: {
        product: {
          id: updatedProduct.id,
          teamId: updatedProduct.teamId,
          name: updatedProduct.name,
          description: updatedProduct.description,
          type: updatedProduct.type,
          receiveMethod: updatedProduct.type === 2 ? null : updatedProduct.receiveMethod,
          salesStartDate: updatedProduct.salesStartDate,
          salesEndDate: updatedProduct.salesEndDate,
          images: {
            thumbnailUrl: normalizedThumbnailUrl,
            detailImageUrls: normalizedDetailImageUrls,
            noticeImgUrl: normalizedNoticeImgUrl,
          },
          goalAmount: updatedProduct.type === 0 ? updatedProduct.goalAmount : null,
          productionStartDate: updatedProduct.productionStartDate,
          productionEndDate: updatedProduct.productionEndDate,
          deliveryStartDate: updatedProduct.deliveryStartDate,
          deliveryEndDate: updatedProduct.deliveryEndDate,
          pickupStartDate: updatedProduct.pickupStartDate,
          pickupEndDate: updatedProduct.pickupEndDate,
          pickupLocation: updatedProduct.pickupLocation,
          price: updatedProduct.price,
          options: parsedOptions.value.map((option) => ({
            name: option.name,
            values: option.values.map((value) => ({
              value: value.value,
              additionalPrice: value.additionalPrice,
            })),
          })),
          updatedAt: updatedProduct.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error('Admin product update error:', error);
    return jsonError(500, 'SERVER_ERROR', '서버 내부 로직 오류');
  }
}
