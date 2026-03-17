import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

type InventoryStatus = 'ALL' | 'ACTIVE' | 'COMPLETED';

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

function parseStatus(input: string | null): InventoryStatus | null {
  if (input == null || input === '') return 'ALL';
  if (input === 'ALL' || input === 'ACTIVE' || input === 'COMPLETED') return input;
  return null;
}

function parseIsSoldOut(input: string | null): boolean | null | 'INVALID' {
  if (input == null || input === '') return null;
  if (input === 'true') return true;
  if (input === 'false') return false;
  return 'INVALID';
}

function parseOptionText(optionSignature: string): string[] {
  let decoded = optionSignature;
  try {
    decoded = decodeURIComponent(optionSignature);
  } catch {
    decoded = optionSignature;
  }

  if (decoded === '__default__' || decoded === 'default') {
    return ['단일상품'];
  }

  const parts = decoded
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return ['단일상품'];

  const parsed = parts
    .map((part) => {
      const equalIndex = part.indexOf('=');
      if (equalIndex < 0) return null;
      const key = part.slice(0, equalIndex).trim();
      const value = part.slice(equalIndex + 1).trim();
      if (!key || !value) return null;
      return `[${key}] ${value}`;
    })
    .filter((value): value is string => value != null);

  return parsed.length > 0 ? parsed : ['단일상품'];
}

function toItemStatus(salesStartDate: Date, salesEndDate: Date, now: Date): 'ACTIVE' | 'COMPLETED' {
  if (now >= salesStartDate && now <= salesEndDate) return 'ACTIVE';
  if (now > salesEndDate) return 'COMPLETED';
  return 'ACTIVE';
}

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      if (auth.reason === 'UNAUTHORIZED') {
        return jsonError(401, 'UNAUTHORIZED', '토큰이 만료되었거나 유효하지 않습니다.');
      }
      return jsonError(403, 'FORBIDDEN', '관리자 권한이 없습니다.');
    }

    const { searchParams } = new URL(request.url);
    const name = (searchParams.get('name') ?? '').trim();
    const status = parseStatus(searchParams.get('status'));
    const isSoldOut = parseIsSoldOut(searchParams.get('isSoldOut'));

    if (!status || isSoldOut === 'INVALID') {
      return jsonError(400, 'INVALID_INPUT', '요청 파라미터가 올바르지 않습니다.');
    }

    const now = new Date();
    const repo = prisma as any;

    const baseWhere: any = {
      ...(name
        ? {
            product: {
              name: { contains: name, mode: 'insensitive' },
            },
          }
        : {}),
      ...(typeof isSoldOut === 'boolean' ? { isSoldOut } : {}),
    };

    if (status === 'ACTIVE') {
      baseWhere.product = {
        ...(baseWhere.product ?? {}),
        salesStartDate: { lte: now },
        salesEndDate: { gte: now },
      };
    } else if (status === 'COMPLETED') {
      baseWhere.product = {
        ...(baseWhere.product ?? {}),
        salesEndDate: { lt: now },
      };
    } else {
      baseWhere.product = {
        ...(baseWhere.product ?? {}),
        salesStartDate: { lte: now },
      };
    }

    const [totalCount, variants] = await Promise.all([
      repo.productVariant.count(),
      repo.productVariant.findMany({
        where: baseWhere,
        select: {
          id: true,
          optionSignature: true,
          isSoldOut: true,
          product: {
            select: {
              id: true,
              name: true,
              salesStartDate: true,
              salesEndDate: true,
            },
          },
        },
        orderBy: [{ product: { salesStartDate: 'desc' } }, { createdAt: 'desc' }],
      }),
    ]);

    return NextResponse.json({
      status: 'success',
      data: {
        totalCount,
        items: variants.map((variant: any, index: number) => ({
          no: index + 1,
          productId: variant.product.id,
          productName: variant.product.name,
          variantId: variant.id,
          optionSignature: variant.optionSignature,
          optionText: parseOptionText(variant.optionSignature),
          salesStartDate: variant.product.salesStartDate,
          salesEndDate: variant.product.salesEndDate,
          status: toItemStatus(variant.product.salesStartDate, variant.product.salesEndDate, now),
          isSoldOut: Boolean(variant.isSoldOut),
        })),
      },
    });
  } catch (error) {
    console.error('[Admin Onsite Inventory List GET Error]', error);
    return jsonError(500, 'SERVER_ERROR', '서버 오류 발생.');
  }
}
