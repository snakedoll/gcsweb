import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { syncProductVariants, type VariantOptionInput } from '@/lib/product-variant';
import { isNonEmptyString, isNonNegativeInt, jsonError, parseAdminOptionsInput, parseDateTime, requireAdmin } from '../../../_utils';

function trimStringArray(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  const values = input
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean);
  return values.length === input.length && values.length > 0 ? values : null;
}

function validRange(start: Date | null, end: Date | null) {
  return !!start && !!end && start.getTime() <= end.getTime();
}

/**
 * GET /api/v1/admin/product/request/update/[requestId]
 * Fetch update request detail
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
      return jsonError(400, 'INVALID_INPUT', 'Invalid request input.');
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
      return jsonError(404, 'UPDATE_REQUEST_NOT_FOUND', 'Update request not found or already processed.');
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
          // Current product snapshot (for comparison)
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
    return jsonError(500, 'SERVER_ERROR', 'Server error.');
  }
}

/**
 * PATCH /api/v1/admin/product/request/update/[requestId]
 * Approve or reject update request
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
      return jsonError(400, 'INVALID_INPUT', 'Invalid request input.');
    }

    const body = await request.json().catch(() => ({}));
    const action = (body as any)?.action;
    if (action !== 'approve' && action !== 'reject') {
      return jsonError(400, 'INVALID_INPUT', 'Invalid request input.');
    }

    const repo = prisma as any;

    const requestRow = await repo.productUpdateRequest.findFirst({
      where: { id: requestId, requestType: 1 },
      select: {
        id: true,
        productId: true,
        product: {
          select: {
            isPublic: true,
            isHome: true,
          },
        },
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
      return jsonError(404, 'UPDATE_REQUEST_NOT_FOUND', 'Update request not found or already processed.');
    }

    if (action === 'reject') {
      // Reject: delete only request payload, keep current product unchanged
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

    // Approve: finalize request payload first, then apply finalized result to current product
    const image = requestRow.images?.[0] ?? null;
    const hasOwn = (key: string) => Object.prototype.hasOwnProperty.call(body, key);

    const approvedName = hasOwn('name')
      ? (isNonEmptyString((body as any).name) ? (body as any).name.trim() : '')
      : requestRow.name;
    const approvedDescription = hasOwn('description')
      ? (typeof (body as any).description === 'string' ? (body as any).description.trim() : '')
      : (requestRow.description ?? '');
    const approvedType = hasOwn('type') ? (body as any).type : requestRow.type;
    if (!isNonEmptyString(approvedName) || ![0, 1, 2].includes(approvedType)) {
      return jsonError(400, 'INVALID_INPUT', 'Invalid request input.');
    }

    const approvedReceiveMethodRaw = hasOwn('receiveMethod') ? (body as any).receiveMethod : requestRow.receiveMethod;
    const receiveMethodValid =
      (approvedType === 0 && [0, 1].includes(approvedReceiveMethodRaw)) ||
      (approvedType === 1 && approvedReceiveMethodRaw === 1) ||
      (approvedType === 2 && approvedReceiveMethodRaw === null);
    if (!receiveMethodValid) {
      return jsonError(400, 'INVALID_INPUT', 'Invalid request input.');
    }
    const approvedReceiveMethod = approvedReceiveMethodRaw as number | null;

    const salesStartInput = hasOwn('salesStartDate') ? (body as any).salesStartDate : requestRow.salesStartDate;
    const salesEndInput = hasOwn('salesEndDate') ? (body as any).salesEndDate : requestRow.salesEndDate;
    const approvedSalesStartDate = parseDateTime(salesStartInput);
    const approvedSalesEndDate = parseDateTime(salesEndInput);
    if (!validRange(approvedSalesStartDate, approvedSalesEndDate)) {
      return jsonError(400, 'INVALID_INPUT', 'Invalid request input.');
    }

    const approvedPrice = hasOwn('price') ? (body as any).price : requestRow.price;
    if (!isNonNegativeInt(approvedPrice)) {
      return jsonError(400, 'INVALID_INPUT', 'Invalid request input.');
    }

    const optionsInput = hasOwn('options')
      ? (body as any).options
      : (requestRow.options ?? []).map((option: any) => ({
          name: option.optionName,
          values: (option.values ?? []).map((value: any) => ({
            value: value.value,
            additionalPrice: value.additionalPrice,
          })),
        }));
    const parsedOptions = parseAdminOptionsInput(optionsInput);
    if (!parsedOptions.ok) {
      return jsonError(400, 'INVALID_OPTION_INPUT', 'Invalid option payload.');
    }
    const approvedOptions: VariantOptionInput[] = parsedOptions.value;

    const approvedThumbnailUrl = hasOwn('thumbnailUrl')
      ? (isNonEmptyString((body as any).thumbnailUrl) ? (body as any).thumbnailUrl.trim() : '')
      : (image?.thumbnailImgUrl ?? '').trim();
    const approvedDetailImageUrls = hasOwn('detailImageUrls')
      ? trimStringArray((body as any).detailImageUrls)
      : Array.isArray(image?.detailImgUrl)
        ? image.detailImgUrl.filter((v: unknown): v is string => typeof v === 'string' && v.trim().length > 0).map((v: string) => v.trim())
        : null;
    const approvedNoticeImgUrl = hasOwn('noticeImgUrl')
      ? (isNonEmptyString((body as any).noticeImgUrl) ? (body as any).noticeImgUrl.trim() : '')
      : (image?.noticeImgUrl ?? '').trim();

    if (!approvedThumbnailUrl || !approvedDetailImageUrls || !approvedNoticeImgUrl) {
      return jsonError(400, 'INVALID_INPUT', 'Invalid request input.');
    }

    const goalAmountInput = hasOwn('goalAmount') ? (body as any).goalAmount : requestRow.goalAmount;
    const approvedGoalAmount = goalAmountInput == null ? null : Number(goalAmountInput);
    if (approvedType === 0 && (approvedGoalAmount == null || !Number.isInteger(approvedGoalAmount) || approvedGoalAmount < 0)) {
      return jsonError(400, 'INVALID_INPUT', 'Invalid request input.');
    }
    if ((approvedType === 1 || approvedType === 2) && approvedGoalAmount != null) {
      return jsonError(400, 'INVALID_INPUT', 'Invalid request input.');
    }

    let approvedProductionStartDate: Date | null = null;
    let approvedProductionEndDate: Date | null = null;
    let approvedDeliveryStartDate: Date | null = null;
    let approvedDeliveryEndDate: Date | null = null;
    let approvedPickupStartDate: Date | null = null;
    let approvedPickupEndDate: Date | null = null;
    let approvedPickupLocation: string | null = null;

    if (approvedType === 0 && approvedReceiveMethod === 0) {
      const productionStartInput = hasOwn('productionStartDate') ? (body as any).productionStartDate : requestRow.productionStartDate;
      const productionEndInput = hasOwn('productionEndDate') ? (body as any).productionEndDate : requestRow.productionEndDate;
      const deliveryStartInput = hasOwn('deliveryStartDate') ? (body as any).deliveryStartDate : requestRow.deliveryStartDate;
      const deliveryEndInput = hasOwn('deliveryEndDate') ? (body as any).deliveryEndDate : requestRow.deliveryEndDate;

      approvedProductionStartDate = parseDateTime(productionStartInput);
      approvedProductionEndDate = parseDateTime(productionEndInput);
      approvedDeliveryStartDate = parseDateTime(deliveryStartInput);
      approvedDeliveryEndDate = parseDateTime(deliveryEndInput);

      if (!validRange(approvedProductionStartDate, approvedProductionEndDate) || !validRange(approvedDeliveryStartDate, approvedDeliveryEndDate)) {
        return jsonError(400, 'INVALID_INPUT', 'Invalid request input.');
      }
    }

    if (approvedType === 0 && approvedReceiveMethod === 1) {
      const pickupStartInput = hasOwn('pickupStartDate') ? (body as any).pickupStartDate : requestRow.pickupStartDate;
      const pickupEndInput = hasOwn('pickupEndDate') ? (body as any).pickupEndDate : requestRow.pickupEndDate;
      const pickupLocationInput = hasOwn('pickupLocation') ? (body as any).pickupLocation : requestRow.pickupLocation;

      approvedPickupStartDate = parseDateTime(pickupStartInput);
      approvedPickupEndDate = parseDateTime(pickupEndInput);
      approvedPickupLocation = isNonEmptyString(pickupLocationInput) ? String(pickupLocationInput).trim() : null;

      if (!validRange(approvedPickupStartDate, approvedPickupEndDate) || !approvedPickupLocation) {
        return jsonError(400, 'INVALID_INPUT', 'Invalid request input.');
      }
    }

    await prisma.$transaction(async (tx: any) => {
      // 1) Finalize ProductUpdateRequest first
      await tx.productUpdateRequest.update({
        where: { id: requestId },
        data: {
          name: approvedName,
          description: approvedDescription,
          type: approvedType,
          receiveMethod: approvedReceiveMethod,
          price: approvedPrice,
          goalAmount: approvedType === 0 ? approvedGoalAmount : null,
          salesStartDate: approvedSalesStartDate!,
          salesEndDate: approvedSalesEndDate!,
          productionStartDate: approvedType === 0 && approvedReceiveMethod === 0 ? approvedProductionStartDate : null,
          productionEndDate: approvedType === 0 && approvedReceiveMethod === 0 ? approvedProductionEndDate : null,
          deliveryStartDate: approvedType === 0 && approvedReceiveMethod === 0 ? approvedDeliveryStartDate : null,
          deliveryEndDate: approvedType === 0 && approvedReceiveMethod === 0 ? approvedDeliveryEndDate : null,
          pickupStartDate: approvedType === 0 && approvedReceiveMethod === 1 ? approvedPickupStartDate : null,
          pickupEndDate: approvedType === 0 && approvedReceiveMethod === 1 ? approvedPickupEndDate : null,
          pickupLocation: approvedType === 0 && approvedReceiveMethod === 1 ? approvedPickupLocation : null,
        },
      });

      await tx.productUpdateRequestImage.deleteMany({ where: { productUpdateRequestId: requestId } });
      await tx.productUpdateRequestImage.create({
        data: {
          productUpdateRequestId: requestId,
          thumbnailImgUrl: approvedThumbnailUrl,
          detailImgUrl: approvedDetailImageUrls,
          noticeImgUrl: approvedNoticeImgUrl,
        },
      });

      await tx.productUpdateRequestOption.deleteMany({ where: { productUpdateRequestId: requestId } });
      for (const option of approvedOptions) {
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
              productId: requestRow.productId,
              optionName: option.name,
              value: value.value,
              additionalPrice: value.additionalPrice,
            },
          });
        }
      }

      // 2) Apply finalized request result to Product
      await tx.product.update({
        where: { id: requestRow.productId },
        data: {
          teamId: requestRow.teamId,
          name: approvedName,
          description: approvedDescription,
          type: approvedType,
          receiveMethod: approvedReceiveMethod,
          price: approvedPrice,
          goalAmount: approvedType === 0 ? approvedGoalAmount : null,
          salesStartDate: approvedSalesStartDate!,
          salesEndDate: approvedSalesEndDate!,
          productionStartDate: approvedType === 0 && approvedReceiveMethod === 0 ? approvedProductionStartDate : null,
          productionEndDate: approvedType === 0 && approvedReceiveMethod === 0 ? approvedProductionEndDate : null,
          deliveryStartDate: approvedType === 0 && approvedReceiveMethod === 0 ? approvedDeliveryStartDate : null,
          deliveryEndDate: approvedType === 0 && approvedReceiveMethod === 0 ? approvedDeliveryEndDate : null,
          pickupStartDate: approvedType === 0 && approvedReceiveMethod === 1 ? approvedPickupStartDate : null,
          pickupEndDate: approvedType === 0 && approvedReceiveMethod === 1 ? approvedPickupEndDate : null,
          pickupLocation: approvedType === 0 && approvedReceiveMethod === 1 ? approvedPickupLocation : null,
          isAdminApproved: true,
          ...(requestRow.product
            ? {
                isPublic: requestRow.product.isPublic,
                isHome: requestRow.product.isHome,
              }
            : {}),
        },
      });

      // Replace product images with finalized request image set
      await tx.productImage.deleteMany({ where: { productId: requestRow.productId } });
      await tx.productImage.create({
        data: {
          productId: requestRow.productId,
          thumbnailImgUrl: approvedThumbnailUrl,
          detailImgUrl: approvedDetailImageUrls,
          noticeImgUrl: approvedNoticeImgUrl,
        },
      });

      // Replace product options with finalized request options
      await tx.productOption.deleteMany({ where: { productId: requestRow.productId } });
      for (const option of approvedOptions) {
        const createdOption = await tx.productOption.create({
          data: {
            productId: requestRow.productId,
            optionName: option.name,
          },
        });

        for (const val of option.values) {
          await tx.productOptionValue.create({
            data: {
              optionId: createdOption.id,
              productId: requestRow.productId,
              optionName: option.name,
              value: val.value,
              additionalPrice: val.additionalPrice,
            },
          });
        }
      }

      await syncProductVariants(tx, requestRow.productId, approvedPrice, approvedOptions);

      // 3) Remove processed request payload
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
    return jsonError(500, 'SERVER_ERROR', 'Server error.');
  }
}
