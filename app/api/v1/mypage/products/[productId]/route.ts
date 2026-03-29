import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { normalizeImageUrl } from '@/lib/image-url';

function toDateOnlyInKst(date: Date | null | undefined): string {
  if (!date) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  if (!year || !month || !day) return '';
  return `${year}-${month}-${day}`;
}

function parseDate(str: string | undefined, endOfDay = false): Date | undefined {
  if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return undefined;
  const d = new Date(`${str}T${endOfDay ? '23:59:59.000' : '00:00:00.000'}+09:00`);
  return isNaN(d.getTime()) ? undefined : d;
}

function parseAndValidateOptions(options: unknown) {
  if (options == null) return { ok: true as const, value: [] as Array<{ optionName: string; values: Array<{ value: string; extraPrice: number }> }> };
  if (!Array.isArray(options)) return { ok: false as const };

  const optionNameSet = new Set<string>();
  const parsed: Array<{ optionName: string; values: Array<{ value: string; extraPrice: number }> }> = [];

  for (const option of options) {
    if (!option || typeof option !== 'object') return { ok: false as const };
    const optionName = typeof (option as any).optionName === 'string' ? (option as any).optionName.trim() : '';
    const values = (option as any).values;
    if (!optionName || optionNameSet.has(optionName) || !Array.isArray(values) || values.length < 1) return { ok: false as const };
    optionNameSet.add(optionName);

    const parsedValues: Array<{ value: string; extraPrice: number }> = [];
    const valueSet = new Set<string>();
    for (const valueItem of values) {
      if (!valueItem || typeof valueItem !== 'object') return { ok: false as const };
      const value = typeof (valueItem as any).value === 'string' ? (valueItem as any).value.trim() : '';
      const extraPrice = (valueItem as any).extraPrice;
      if (!value || valueSet.has(value) || !Number.isInteger(extraPrice) || extraPrice < 0) return { ok: false as const };
      valueSet.add(value);
      parsedValues.push({ value, extraPrice });
    }

    parsed.push({ optionName, values: parsedValues });
  }

  return { ok: true as const, value: parsed };
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
        { status: 'error', code: 'UNAUTHORIZED', message: 'Login required.' },
        { status: 401 }
      );
    }

    const productId = params?.productId;
    if (!isValidProductId(productId)) {
      return NextResponse.json(
        { status: 'error', code: 'INVALID_INPUT', message: 'Invalid request input.' },
        { status: 400 }
      );
    }

    const teamIds = await getMyTeamIds(session.user.id);
    if (teamIds.length === 0) {
      return NextResponse.json(
        { status: 'error', code: 'FORBIDDEN', message: 'Forbidden.' },
        { status: 403 }
      );
    }

    const product = await prisma.product.findFirst({
      where: {
        id: productId.trim(),
        teamId: { in: teamIds },
        isAdminApproved: true,
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
        { status: 'error', code: 'NOT_FOUND', message: 'Not found.' },
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
          salesStartDate: toDateOnlyInKst(product.salesStartDate),
          salesEndDate: toDateOnlyInKst(product.salesEndDate),
          productionStartDate: toDateOnlyInKst(product.productionStartDate),
          productionEndDate: toDateOnlyInKst(product.productionEndDate),
          deliveryStartDate: toDateOnlyInKst(product.deliveryStartDate),
          deliveryEndDate: toDateOnlyInKst(product.deliveryEndDate),
          pickupStartDate: toDateOnlyInKst(product.pickupStartDate),
          pickupEndDate: toDateOnlyInKst(product.pickupEndDate),
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
      { status: 'error', code: 'SERVER_ERROR', message: 'Server error.' },
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
        { status: 'error', code: 'UNAUTHORIZED', message: 'Login required.' },
        { status: 401 }
      );
    }

    const productId = params?.productId;
    if (!isValidProductId(productId)) {
      return NextResponse.json(
        { status: 'error', code: 'INVALID_INPUT', message: 'Invalid request input.' },
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
        { status: 'error', code: 'INVALID_INPUT', message: 'Invalid request input.' },
        { status: 400 }
      );
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, userId: true, teamMember: true },
    });
    if (!team) {
      return NextResponse.json(
        { status: 'error', code: 'NOT_FOUND', message: 'Not found.' },
        { status: 404 }
      );
    }

    const memberIds = Array.isArray(team.teamMember) ? team.teamMember : [];
    const canUpdate = team.userId === session.user.id || memberIds.includes(session.user.id);
    if (!canUpdate) {
      return NextResponse.json(
        { status: 'error', code: 'FORBIDDEN', message: 'Forbidden.' },
        { status: 403 }
      );
    }

    const targetProduct = await prisma.product.findFirst({
      where: {
        id: productId.trim(),
        teamId: { in: await getMyTeamIds(session.user.id) },
        isAdminApproved: true,
      },
      select: { id: true },
    });

    if (!targetProduct) {
      return NextResponse.json(
        { status: 'error', code: 'NOT_FOUND', message: 'Not found.' },
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
        { status: 'error', code: 'INVALID_INPUT', message: 'Invalid request input.' },
        { status: 400 }
      );
    }

    if (!thumbnailImgUrl || typeof thumbnailImgUrl !== 'string' || !thumbnailImgUrl.trim()) {
      return NextResponse.json(
        { status: 'error', code: 'INVALID_INPUT', message: 'Invalid request input.' },
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
        { status: 'error', code: 'INVALID_INPUT', message: 'Invalid request input.' },
        { status: 400 }
      );
    }

    if (detailUrls.length === 0) {
      return NextResponse.json(
        { status: 'error', code: 'INVALID_INPUT', message: 'Invalid request input.' },
        { status: 400 }
      );
    }

    if (!normalizedNoticeImgUrl) {
      return NextResponse.json(
        { status: 'error', code: 'INVALID_INPUT', message: 'Invalid request input.' },
        { status: 400 }
      );
    }

    const salesStart = parseDate(salesStartDate);
    const salesEnd = parseDate(salesEndDate, true);
    if (!salesStart || !salesEnd) {
      return NextResponse.json(
        { status: 'error', code: 'INVALID_INPUT', message: 'Invalid request input.' },
        { status: 400 }
      );
    }

    if (type === 0) {
      if (!(receiveMethod === 0 || receiveMethod === 1)) {
        return NextResponse.json(
          { status: 'error', code: 'INVALID_INPUT', message: 'Invalid request input.' },
          { status: 400 }
        );
      }
      if (receiveMethod === 0) {
        if (
          !parseDate(productionStartDate) ||
          !parseDate(productionEndDate, true) ||
          !parseDate(deliveryStartDate) ||
          !parseDate(deliveryEndDate, true)
        ) {
          return NextResponse.json(
            { status: 'error', code: 'INVALID_INPUT', message: 'Invalid request input.' },
            { status: 400 }
          );
        }
      } else {
        if (
          !parseDate(pickupStartDate) ||
          !parseDate(pickupEndDate, true) ||
          !(typeof pickupLocation === 'string' && pickupLocation.trim())
        ) {
          return NextResponse.json(
            { status: 'error', code: 'INVALID_INPUT', message: 'Invalid request input.' },
            { status: 400 }
          );
        }
      }
    } else if (type === 1) {
      if (receiveMethod !== 1) {
        return NextResponse.json(
          { status: 'error', code: 'INVALID_INPUT', message: 'Invalid request input.' },
          { status: 400 }
        );
      }
    } else {
      if (receiveMethod !== null) {
        return NextResponse.json(
          { status: 'error', code: 'INVALID_INPUT', message: 'Invalid request input.' },
          { status: 400 }
        );
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

    const parsedOptions = parseAndValidateOptions(options);
    if (!parsedOptions.ok) {
      return NextResponse.json(
        { status: 'error', code: 'INVALID_OPTION_INPUT', message: 'Invalid option payload.' },
        { status: 400 }
      );
    }
    const optionList = parsedOptions.value;

    const requestRow = await prisma.$transaction(async (tx) => {
      const existingRequest = await tx.productUpdateRequest.findFirst({
        where: { productId: targetProduct.id, requestType: 1 },
        select: { id: true },
      });

      const savedRequest = existingRequest
        ? await tx.productUpdateRequest.update({
            where: { id: existingRequest.id },
            data: {
              requestedByUserId: session.user.id,
              teamId,
              name: name.trim(),
              description: typeof description === 'string' ? description.trim() : '',
              type,
              price: priceNum,
              goalAmount: resolvedGoalAmount,
              salesStartDate: salesStart,
              salesEndDate: salesEnd,
              productionStartDate: parseDate(productionStartDate) ?? undefined,
              productionEndDate: parseDate(productionEndDate, true) ?? undefined,
              deliveryStartDate: parseDate(deliveryStartDate) ?? undefined,
              deliveryEndDate: parseDate(deliveryEndDate, true) ?? undefined,
              pickupStartDate: parseDate(pickupStartDate) ?? undefined,
              pickupEndDate: parseDate(pickupEndDate, true) ?? undefined,
              pickupLocation: typeof pickupLocation === 'string' && pickupLocation.trim() ? pickupLocation.trim() : undefined,
              receiveMethod,
            },
          })
        : await tx.productUpdateRequest.create({
            data: {
              productId: targetProduct.id,
              requestedByUserId: session.user.id,
              teamId,
              requestType: 1,
              name: name.trim(),
              description: typeof description === 'string' ? description.trim() : '',
              type,
              price: priceNum,
              goalAmount: resolvedGoalAmount,
              salesStartDate: salesStart,
              salesEndDate: salesEnd,
              productionStartDate: parseDate(productionStartDate) ?? undefined,
              productionEndDate: parseDate(productionEndDate, true) ?? undefined,
              deliveryStartDate: parseDate(deliveryStartDate) ?? undefined,
              deliveryEndDate: parseDate(deliveryEndDate, true) ?? undefined,
              pickupStartDate: parseDate(pickupStartDate) ?? undefined,
              pickupEndDate: parseDate(pickupEndDate, true) ?? undefined,
              pickupLocation: typeof pickupLocation === 'string' && pickupLocation.trim() ? pickupLocation.trim() : undefined,
              receiveMethod,
            },
          });

      await tx.productUpdateRequestImage.deleteMany({
        where: { productUpdateRequestId: savedRequest.id },
      });
      await tx.productUpdateRequestImage.create({
        data: {
          productUpdateRequestId: savedRequest.id,
          thumbnailImgUrl: normalizedThumbnailImgUrl,
          detailImgUrl: detailUrls,
          noticeImgUrl: normalizedNoticeImgUrl,
        },
      });

      await tx.productUpdateRequestOption.deleteMany({
        where: { productUpdateRequestId: savedRequest.id },
      });
      for (const opt of optionList) {
        const optionName = opt.optionName;
        const reqOption = await tx.productUpdateRequestOption.create({
          data: { productUpdateRequestId: savedRequest.id, optionName },
        });

        for (const v of opt.values) {
          const value = v.value;
          const additionalPrice = v.extraPrice;
          await tx.productUpdateRequestOptionValue.create({
            data: {
              optionId: reqOption.id,
              productId: savedRequest.productId,
              optionName,
              value,
              additionalPrice,
            },
          });
        }
      }

      return savedRequest;
    });

    return NextResponse.json({
      status: 'success',
      data: {
        requestId: requestRow.id,
        productId: targetProduct.id,
        message: 'Product update request submitted.',
      },
    });
  } catch (error) {
    console.error('Product update request error:', error);
    return NextResponse.json(
      { status: 'error', code: 'SERVER_ERROR', message: 'Server error.' },
      { status: 500 }
    );
  }
}

