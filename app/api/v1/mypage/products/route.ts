import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { normalizeImageUrl } from '@/lib/image-url';

/** 내가 속한 팀(팀장 또는 팀원)의 상품 목록 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { status: 'error', code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const myTeams = await prisma.team.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          { teamMember: { has: session.user.id } },
        ],
      },
      select: { id: true },
    });
    const teamIds = myTeams.map((t) => t.id);
    if (teamIds.length === 0) {
      return NextResponse.json({ status: 'success', data: { products: [] } });
    }

    const products = await prisma.product.findMany({
      where: { teamId: { in: teamIds } },
      include: {
        images: { take: 1, orderBy: { createdAt: 'asc' } },
        team: { select: { teamName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const list = products.map((p) => {
      const thumb = p.images[0]?.thumbnailImgUrl ?? null;
      const goal = p.goalAmount ?? 0;
      const current = p.currentAmount ?? 0;
      const progressPercent = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0;
      const isFund = p.type === 0;
      return {
        id: p.id,
        type: p.type,
        name: p.name,
        description: p.description ?? '',
        teamName: p.team.teamName,
        likeCount: p.likeCount,
        salesStartDate: p.salesStartDate?.toISOString().slice(0, 10) ?? null,
        salesEndDate: p.salesEndDate?.toISOString().slice(0, 10) ?? null,
        goalAmount: goal,
        currentAmount: current,
        progressPercent,
        thumbnailImgUrl: normalizeImageUrl(thumb),
      };
    });

    return NextResponse.json({ status: 'success', data: { products: list } });
  } catch (error) {
    console.error('My products list error:', error);
    return NextResponse.json(
      { status: 'error', code: 'SERVER_ERROR', message: '서버 내부 오류' },
      { status: 500 }
    );
  }
}

function parseDate(str: string | undefined): Date | undefined {
  if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return undefined;
  const d = new Date(str + 'T00:00:00');
  return isNaN(d.getTime()) ? undefined : d;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { status: 'error', code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' },
        { status: 401 }
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
      price?: number;
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
    const canCreate = team.userId === session.user.id || memberIds.includes(session.user.id);
    if (!canCreate) {
      return NextResponse.json(
        { status: 'error', code: 'FORBIDDEN', message: '해당 팀에 상품을 등록할 권한이 없습니다.' },
        { status: 403 }
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
        { status: 'error', code: 'INVALID_INPUT', message: '상세 이미지는 1장 이상 필요합니다.' },
        { status: 400 }
      );
    }

    const salesStart = parseDate(salesStartDate);
    const salesEnd = parseDate(salesEndDate);
    if (!salesStart || !salesEnd) {
      return NextResponse.json(
        { status: 'error', code: 'INVALID_INPUT', message: '판매 시작일·종료일을 올바르게 입력해주세요.' },
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
            { status: 'error', code: 'INVALID_INPUT', message: '예상 제작 기간·배송 기간을 올바르게 입력해주세요.' },
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
            { status: 'error', code: 'INVALID_INPUT', message: '예상 수령 기간·수령 장소를 입력해주세요.' },
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

    const productData = {
      teamId,
      name: name.trim(),
      description: typeof description === 'string' ? description.trim() : '',
      type,
      status: 0,
      price: priceNum,
      goalAmount: resolvedGoalAmount,
      currentAmount: 0,
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
      isPublic: false,
      likeCount: 0,
      viewCount: 0,
    };

    const optionList = Array.isArray(options) ? options : [];

    const product = await prisma.$transaction(async (tx) => {
      const createdProduct = await tx.product.create({
        data: {
          ...productData,
          isAdminApproved: false,
          isPublic: false,
          isHome: false,
        },
      });

      await tx.productImage.create({
        data: {
          productId: createdProduct.id,
          thumbnailImgUrl: normalizedThumbnailImgUrl,
          detailImgUrl: detailUrls,
          // ProductImage.noticeImgUrl is non-null in schema, keep empty until admin approval.
          noticeImgUrl: normalizedNoticeImgUrl ?? '',
        },
      });

      for (const opt of optionList) {
        const optionName = typeof opt?.optionName === 'string' ? opt.optionName.trim() : '';
        if (!optionName) continue;

        const optionRow = await tx.productOption.create({
          data: { productId: createdProduct.id, optionName },
        });

        const values = Array.isArray(opt.values) ? opt.values : [];
        for (const v of values) {
          const value = typeof v?.value === 'string' ? v.value.trim() : '';
          if (!value) continue;
          const additionalPrice = typeof v?.extraPrice === 'number' ? Math.max(0, v.extraPrice) : 0;
          await tx.productOptionValue.create({
            data: { optionId: optionRow.id, value, additionalPrice },
          });
        }
      }

      const requestRow = await tx.productUpdateRequest.create({
        data: {
          productId: createdProduct.id,
          requestedByUserId: session.user.id,
          teamId,
          requestType: 0,
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
          productUpdateRequestId: requestRow.id,
          thumbnailImgUrl: normalizedThumbnailImgUrl,
          detailImgUrl: detailUrls,
          // Policy: register request can have null notice image before admin review.
          noticeImgUrl: normalizedNoticeImgUrl ?? null,
        },
      });

      for (const opt of optionList) {
        const optionName = typeof opt?.optionName === 'string' ? opt.optionName.trim() : '';
        if (!optionName) continue;

        const reqOption = await tx.productUpdateRequestOption.create({
          data: { productUpdateRequestId: requestRow.id, optionName },
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

      return createdProduct;
    });

    return NextResponse.json({
      status: 'success',
      data: {
        productId: product.id,
        message: '등록 요청이 접수되었습니다. 관리자 승인 후 노출됩니다.',
      },
    });
  } catch (error) {
    console.error('Product registration error:', error);
    return NextResponse.json(
      { status: 'error', code: 'SERVER_ERROR', message: '서버 내부 오류' },
      { status: 500 }
    );
  }
}
