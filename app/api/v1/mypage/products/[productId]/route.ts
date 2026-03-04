import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { normalizeImageUrl } from '@/lib/image-url';

function parseDate(str: string | undefined): Date | undefined {
  if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return undefined;
  const d = new Date(str + 'T00:00:00');
  return isNaN(d.getTime()) ? undefined : d;
}

function isValidProductId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

async function getMyTeamIds(userId: string): Promise<string[]> {
  const myTeams = await prisma.team.findMany({
    where: {
      OR: [{ userId }, { teamMember: { has: userId } }],
    },
    select: { id: true },
  });
  return myTeams.map((t) => t.id);
}

export async function GET(
  _request: Request,
  { params }: { params: { productId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { status: 'error', code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const productId = params?.productId;
    if (!isValidProductId(productId)) {
      return NextResponse.json(
        { status: 'error', code: 'INVALID_INPUT', message: 'productId 형식 오류' },
        { status: 400 }
      );
    }

    const teamIds = await getMyTeamIds(session.user.id);
    if (teamIds.length === 0) {
      return NextResponse.json(
        { status: 'error', code: 'FORBIDDEN', message: '해당 상품을 수정할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    const product = await prisma.product.findFirst({
      where: {
        id: productId.trim(),
        teamId: { in: teamIds },
      },
      include: {
        team: { select: { teamName: true } },
        images: { orderBy: { createdAt: 'asc' }, take: 1 },
        options: {
          orderBy: { optionName: 'asc' },
          include: {
            values: {
              orderBy: { value: 'asc' },
            },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { status: 'error', code: 'NOT_FOUND', message: '상품을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const image = product.images?.[0] ?? null;

    return NextResponse.json({
      status: 'success',
      data: {
        product: {
          id: product.id,
          teamId: product.teamId,
          teamName: product.team?.teamName ?? '',
          name: product.name,
          description: product.description ?? '',
          type: product.type,
          receiveMethod: product.receiveMethod,
          price: product.price,
          goalAmount: product.goalAmount ?? 0,
          salesStartDate: product.salesStartDate?.toISOString().slice(0, 10) ?? '',
          salesEndDate: product.salesEndDate?.toISOString().slice(0, 10) ?? '',
          productionStartDate: product.productionStartDate?.toISOString().slice(0, 10) ?? '',
          productionEndDate: product.productionEndDate?.toISOString().slice(0, 10) ?? '',
          deliveryStartDate: product.deliveryStartDate?.toISOString().slice(0, 10) ?? '',
          deliveryEndDate: product.deliveryEndDate?.toISOString().slice(0, 10) ?? '',
          pickupStartDate: product.pickupStartDate?.toISOString().slice(0, 10) ?? '',
          pickupEndDate: product.pickupEndDate?.toISOString().slice(0, 10) ?? '',
          pickupLocation: product.pickupLocation ?? '',
          thumbnailImgUrl: normalizeImageUrl(image?.thumbnailImgUrl ?? null) ?? '',
          detailImgUrls: (image?.detailImgUrl ?? [])
            .map((url) => normalizeImageUrl(url))
            .filter((url): url is string => typeof url === 'string' && url.length > 0),
          options: (product.options ?? []).map((option) => ({
            optionName: option.optionName,
            values: (option.values ?? []).map((value) => ({
              value: value.value,
              extraPrice: value.additionalPrice,
            })),
          })),
        },
      },
    });
  } catch (error) {
    console.error('My product detail error:', error);
    return NextResponse.json(
      { status: 'error', code: 'SERVER_ERROR', message: '서버 내부 오류' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { productId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { status: 'error', code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const productId = params?.productId;
    if (!isValidProductId(productId)) {
      return NextResponse.json(
        { status: 'error', code: 'INVALID_INPUT', message: 'productId 형식 오류' },
        { status: 400 }
      );
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
      thumbnailImgUrl,
      detailImgUrls,
      noticeImgUrl,
    } = body as {
      teamId?: string;
      name?: string;
      description?: string;
      type?: number;
      receiveMethod?: number;
      salesStartDate?: string;
      salesEndDate?: string;
      goalAmount?: number;
      productionStartDate?: string;
      productionEndDate?: string;
      deliveryStartDate?: string;
      deliveryEndDate?: string;
      pickupStartDate?: string;
      pickupEndDate?: string;
      pickupLocation?: string;
      price?: number | string;
      options?: { optionName: string; values: { value: string; extraPrice: number }[] }[];
      thumbnailImgUrl?: string;
      detailImgUrls?: string[];
      noticeImgUrl?: string;
    };

    if (!teamId || typeof teamId !== 'string' || !name?.trim() || typeof type !== 'number' || ![0, 1, 2].includes(type)) {
      return NextResponse.json(
        { status: 'error', code: 'INVALID_INPUT', message: 'teamId, name, type(0/1/2)는 필수입니다.' },
        { status: 400 }
      );
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, userId: true, teamMember: true },
    });
    if (!team) {
      return NextResponse.json(
        { status: 'error', code: 'NOT_FOUND', message: '해당 팀을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const memberIds = Array.isArray(team.teamMember) ? team.teamMember : [];
    const canUpdate = team.userId === session.user.id || memberIds.includes(session.user.id);
    if (!canUpdate) {
      return NextResponse.json(
        { status: 'error', code: 'FORBIDDEN', message: '해당 팀 상품 수정 요청 권한이 없습니다.' },
        { status: 403 }
      );
    }

    const targetProduct = await prisma.product.findFirst({
      where: { id: productId.trim(), teamId: { in: await getMyTeamIds(session.user.id) } },
      select: { id: true },
    });

    if (!targetProduct) {
      return NextResponse.json(
        { status: 'error', code: 'NOT_FOUND', message: '수정 대상 상품을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const priceNum =
      typeof price === 'number' && Number.isFinite(price)
        ? Math.floor(price)
        : typeof price === 'string'
          ? (() => {
              const n = Number(price.replace(/\D/g, ''));
              return Number.isFinite(n) ? Math.floor(n) : 0;
            })()
          : 0;

    if (priceNum < 0) {
      return NextResponse.json(
        { status: 'error', code: 'INVALID_INPUT', message: '가격은 0 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    if (!thumbnailImgUrl || typeof thumbnailImgUrl !== 'string' || !thumbnailImgUrl.trim()) {
      return NextResponse.json(
        { status: 'error', code: 'INVALID_INPUT', message: '썸네일 이미지 URL은 필수입니다.' },
        { status: 400 }
      );
    }

    const normalizedThumbnailImgUrl = normalizeImageUrl(thumbnailImgUrl.trim());
    const detailUrls = Array.isArray(detailImgUrls)
      ? detailImgUrls
          .map((u) => normalizeImageUrl(typeof u === 'string' ? u : null))
          .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
      : [];
    const normalizedNoticeImgUrl = normalizeImageUrl(typeof noticeImgUrl === 'string' ? noticeImgUrl : null);

    if (!normalizedThumbnailImgUrl) {
      return NextResponse.json(
        { status: 'error', code: 'INVALID_INPUT', message: '유효한 썸네일 이미지 URL이 필요합니다.' },
        { status: 400 }
      );
    }

    if (detailUrls.length === 0) {
      return NextResponse.json(
        { status: 'error', code: 'INVALID_INPUT', message: '상세 이미지는 1개 이상 필요합니다.' },
        { status: 400 }
      );
    }

    const salesStart = parseDate(salesStartDate);
    const salesEnd = parseDate(salesEndDate);
    if (!salesStart || !salesEnd) {
      return NextResponse.json(
        { status: 'error', code: 'INVALID_INPUT', message: '판매 시작일/종료일을 올바르게 입력해 주세요.' },
        { status: 400 }
      );
    }

    const receiveMethodResolved = typeof receiveMethod === 'number' && receiveMethod === 1 ? 1 : 0;
    if (type === 0) {
      if (receiveMethodResolved === 0) {
        if (
          !parseDate(productionStartDate) ||
          !parseDate(productionEndDate) ||
          !parseDate(deliveryStartDate) ||
          !parseDate(deliveryEndDate)
        ) {
          return NextResponse.json(
            { status: 'error', code: 'INVALID_INPUT', message: '예상 제작 기간/배송 기간을 올바르게 입력해 주세요.' },
            { status: 400 }
          );
        }
      } else {
        if (
          !parseDate(pickupStartDate) ||
          !parseDate(pickupEndDate) ||
          !(typeof pickupLocation === 'string' && pickupLocation.trim())
        ) {
          return NextResponse.json(
            { status: 'error', code: 'INVALID_INPUT', message: '예상 수령 기간/수령 장소를 입력해 주세요.' },
            { status: 400 }
          );
        }
      }
    }

    const goalAmountNum =
      typeof goalAmount === 'number'
        ? goalAmount
        : typeof goalAmount === 'string'
          ? Number(goalAmount)
          : NaN;
    const resolvedGoalAmount =
      !Number.isNaN(goalAmountNum) && goalAmountNum >= 0 ? goalAmountNum : null;

    const optionList = Array.isArray(options) ? options : [];

    const requestRow = await prisma.$transaction(async (tx) => {
      const createdRequest = await tx.productUpdateRequest.create({
        data: {
          productId: targetProduct.id,
          requestedByUserId: session.user.id,
          teamId,
          requestType: 1,
          name: name.trim(),
          description: typeof description === 'string' ? description.trim() : '',
          type,
          status: 0,
          price: priceNum,
          goalAmount: resolvedGoalAmount,
          salesStartDate: salesStart,
          salesEndDate: salesEnd,
          productionStartDate: parseDate(productionStartDate) ?? undefined,
          productionEndDate: parseDate(productionEndDate) ?? undefined,
          deliveryStartDate: parseDate(deliveryStartDate) ?? undefined,
          deliveryEndDate: parseDate(deliveryEndDate) ?? undefined,
          pickupStartDate: parseDate(pickupStartDate) ?? undefined,
          pickupEndDate: parseDate(pickupEndDate) ?? undefined,
          pickupLocation: typeof pickupLocation === 'string' && pickupLocation.trim() ? pickupLocation.trim() : undefined,
          receiveMethod: typeof receiveMethod === 'number' && [0, 1].includes(receiveMethod) ? receiveMethod : 0,
        },
      });

      await tx.productUpdateRequestImage.create({
        data: {
          productUpdateRequestId: createdRequest.id,
          thumbnailImgUrl: normalizedThumbnailImgUrl,
          detailImgUrl: detailUrls,
          noticeImgUrl: normalizedNoticeImgUrl ?? null,
        },
      });

      for (const opt of optionList) {
        const optionName = typeof opt?.optionName === 'string' ? opt.optionName.trim() : '';
        if (!optionName) continue;

        const reqOption = await tx.productUpdateRequestOption.create({
          data: { productUpdateRequestId: createdRequest.id, optionName },
        });

        const values = Array.isArray(opt.values) ? opt.values : [];
        for (const v of values) {
          const value = typeof v?.value === 'string' ? v.value.trim() : '';
          if (!value) continue;
          const additionalPrice = typeof v?.extraPrice === 'number' ? Math.max(0, v.extraPrice) : 0;
          await tx.productUpdateRequestOptionValue.create({
            data: { optionId: reqOption.id, value, additionalPrice },
          });
        }
      }

      return createdRequest;
    });

    return NextResponse.json({
      status: 'success',
      data: {
        requestId: requestRow.id,
        productId: targetProduct.id,
        message: '상품글 수정이 요청되었습니다.',
      },
    });
  } catch (error) {
    console.error('Product update request error:', error);
    return NextResponse.json(
      { status: 'error', code: 'SERVER_ERROR', message: '서버 내부 오류' },
      { status: 500 }
    );
  }
}
