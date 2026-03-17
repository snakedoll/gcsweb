import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { normalizeImageUrl } from '@/lib/image-url';

/** ?닿? ?랁븳 ?(????먮뒗 ??????곹뭹 紐⑸줉 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { status: 'error', code: 'UNAUTHORIZED', message: '濡쒓렇?몄씠 ?꾩슂?⑸땲??' },
        { status: 401 }
      );
    }

    const myTeams = await prisma.team.findMany({
      where: {
        OR: [{ userId: session.user.id }, { teamMember: { has: session.user.id } }],
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
      { status: 'error', code: 'SERVER_ERROR', message: '?쒕쾭 ?대? ?ㅻ쪟' },
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
        { status: 'error', code: 'UNAUTHORIZED', message: '濡쒓렇?몄씠 ?꾩슂?⑸땲??' },
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
      receiveMethod?: number | null;
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
        { status: 'error', code: 'INVALID_INPUT', message: 'teamId, name, type(0/1/2)???꾩닔?낅땲??' },
        { status: 400 }
      );
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, userId: true, teamMember: true },
    });
    if (!team) {
      return NextResponse.json(
        { status: 'error', code: 'NOT_FOUND', message: '?대떦 ???李얠쓣 ???놁뒿?덈떎.' },
        { status: 404 }
      );
    }
    const memberIds = Array.isArray(team.teamMember) ? team.teamMember : [];
    const canCreate = team.userId === session.user.id || memberIds.includes(session.user.id);
    if (!canCreate) {
      return NextResponse.json(
        { status: 'error', code: 'FORBIDDEN', message: '?대떦 ????곹뭹???깅줉??沅뚰븳???놁뒿?덈떎.' },
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
        { status: 'error', code: 'INVALID_INPUT', message: '媛寃⑹? 0 ?댁긽?댁뼱???⑸땲??' },
        { status: 400 }
      );
    }

    if (!thumbnailImgUrl || typeof thumbnailImgUrl !== 'string' || !thumbnailImgUrl.trim()) {
      return NextResponse.json(
        { status: 'error', code: 'INVALID_INPUT', message: '?몃꽕???대?吏 URL? ?꾩닔?낅땲??' },
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
        { status: 'error', code: 'INVALID_INPUT', message: '?좏슚???몃꽕???대?吏 URL???꾩슂?⑸땲??' },
        { status: 400 }
      );
    }
    if (detailUrls.length === 0) {
      return NextResponse.json(
        { status: 'error', code: 'INVALID_INPUT', message: '?곸꽭 ?대?吏??1媛??댁긽 ?꾩슂?⑸땲??' },
        { status: 400 }
      );
    }

    const salesStart = parseDate(salesStartDate);
    const salesEnd = parseDate(salesEndDate);
    if (!salesStart || !salesEnd) {
      return NextResponse.json(
        { status: 'error', code: 'INVALID_INPUT', message: '?먮ℓ ?쒖옉??醫낅즺?쇱쓣 ?щ컮瑜닿쾶 ?낅젰??二쇱꽭??' },
        { status: 400 }
      );
    }

    if (type === 0) {
      if (!(receiveMethod === 0 || receiveMethod === 1)) {
        return NextResponse.json(
          { status: 'error', code: 'INVALID_INPUT', message: 'Fund ?곹뭹? ?섎졊諛⑹떇(0/1)???꾩슂?⑸땲??' },
          { status: 400 }
        );
      }
      if (receiveMethod === 0) {
        if (
          !parseDate(productionStartDate) ||
          !parseDate(productionEndDate) ||
          !parseDate(deliveryStartDate) ||
          !parseDate(deliveryEndDate)
        ) {
          return NextResponse.json(
            { status: 'error', code: 'INVALID_INPUT', message: '?덉긽 ?쒖옉 湲곌컙/諛곗넚 湲곌컙???щ컮瑜닿쾶 ?낅젰??二쇱꽭??' },
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
            { status: 'error', code: 'INVALID_INPUT', message: '?덉긽 ?섎졊 湲곌컙/?섎졊 ?μ냼瑜??낅젰??二쇱꽭??' },
            { status: 400 }
          );
        }
      }
    } else if (type === 1) {
      if (receiveMethod !== 1) {
        return NextResponse.json(
          { status: 'error', code: 'INVALID_INPUT', message: 'BuyNow ?곹뭹? receiveMethod=1 ?댁뼱???⑸땲??' },
          { status: 400 }
        );
      }
    } else {
      if (receiveMethod !== null) {
        return NextResponse.json(
          { status: 'error', code: 'INVALID_INPUT', message: 'PartnerUp ?곹뭹? receiveMethod=null ?댁뼱???⑸땲??' },
          { status: 400 }
        );
      }
    }

    const goalAmountNum = typeof goalAmount === 'number' ? goalAmount : typeof goalAmount === 'string' ? Number(goalAmount) : NaN;
    const resolvedGoalAmount = !Number.isNaN(goalAmountNum) && goalAmountNum >= 0 ? goalAmountNum : null;

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
      receiveMethod,
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
            data: {
              optionId: optionRow.id,
              productId: createdProduct.id,
              optionName,
              value,
              additionalPrice,
            },
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
          receiveMethod,
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
            data: {
              optionId: reqOption.id,
              productId: requestRow.productId,
              optionName,
              value,
              additionalPrice,
            },
          });
        }
      }

      return createdProduct;
    });

    return NextResponse.json({
      status: 'success',
      data: {
        productId: product.id,
        message: '?깅줉 ?붿껌???묒닔?섏뿀?듬땲?? 愿由ъ옄 ?뺤씤 ???몄텧?⑸땲??',
      },
    });
  } catch (error) {
    console.error('Product registration error:', error);
    return NextResponse.json(
      { status: 'error', code: 'SERVER_ERROR', message: '?쒕쾭 ?대? ?ㅻ쪟' },
      { status: 500 }
    );
  }
}

