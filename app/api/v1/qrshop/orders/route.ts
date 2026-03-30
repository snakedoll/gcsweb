import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getSaleStatusByDate } from '@/lib/sale-date';
import {
  ORDER_CODE_CONFIG,
  buildOrderCode,
  getOrderDateKeyYYMMDD,
  mapProductTypeToOrderCode,
} from '@/lib/order-code';
import { resolveQrShopOrderLines } from '@/lib/qrshop/catalog';
import {
  assertFairShopStockForLines,
  ensureFairShopProductsSeeded,
  fairShopDecrementStockAndWriteHistory,
  loadFairShopStockMap,
  recordFairShopUnmetDemandForZeroStockLines,
} from '@/lib/qrshop/fair-shop';
import { isMatchedVariantSoldOut } from '@/lib/variant-signature';

function jsonError(status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ status: 'error', code, message, ...extra }, { status });
}

function hashGuestToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function toDbJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === undefined || value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

const bodySchema = z.object({
  lines: z
    .array(
      z.object({
        itemId: z.string().min(1),
        quantity: z.coerce.number().int().min(1).max(99),
      }),
    )
    .min(1),
  /** 0: 카드(온라인) 결제창, 3: 현장결제(즉시 접수) */
  paymentMethod: z.union([z.literal(0), z.literal(3)]).optional().default(0),
});

const ORDER_CREATE_MAX_RETRIES = 3;
const ORDER_CREATE_RETRY_BASE_DELAY_MS = 30;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryableOrderCreateError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return true;
    if (error.code === 'P2034') return true;
  }
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return message.includes('could not serialize access') || message.includes('serialization failure');
}

function toTypeGroup(type: number): 0 | 1 {
  return type === 0 ? 0 : 1;
}

/**
 * QRshop: item.json 기준으로 금액을 검증한 뒤, 단일 플레이스홀더 Buy Now 상품에 additionalPrice로 행 단가를 싣는다.
 */
export async function POST(request: Request) {
  try {
    const placeholderProductId = process.env.QRSHOP_BUYNOW_PRODUCT_ID?.trim() ?? '';
    if (!placeholderProductId) {
      return jsonError(503, 'QRSHOP_NOT_CONFIGURED', 'QRSHOP_BUYNOW_PRODUCT_ID is not set.');
    }

    const session = await getServerSession(authOptions);
    const sessionEmail = session?.user?.email ?? null;

    let user: { id: string } | null = null;
    if (sessionEmail) {
      user = await prisma.user.findFirst({ where: { email: sessionEmail }, select: { id: true } });
    }

    const rawGuestToken = request.headers.get('x-guest-token')?.trim() ?? '';
    const isAuthenticated = !!user;
    if (!isAuthenticated && !rawGuestToken) {
      return jsonError(400, 'GUEST_TOKEN_REQUIRED', 'x-guest-token is required for guest order.');
    }

    const buyerType: 'USER' | 'GUEST' = isAuthenticated ? 'USER' : 'GUEST';
    const buyerUserId = isAuthenticated ? user!.id : null;
    const buyerGuestTokenHash = !isAuthenticated ? hashGuestToken(rawGuestToken) : null;

    const jsonBody = await request.json();
    const parsedBody = bodySchema.safeParse(jsonBody);
    if (!parsedBody.success) {
      return jsonError(400, 'INVALID_INPUT', parsedBody.error.issues[0]?.message ?? 'invalid body');
    }

    const resolvedLines = resolveQrShopOrderLines(parsedBody.data.lines);
    if (!resolvedLines.ok) {
      return jsonError(400, 'INVALID_CART', resolvedLines.message);
    }

    const { resolved, paymentAmount } = resolvedLines;

    await ensureFairShopProductsSeeded(prisma);
    const stockMap = await loadFairShopStockMap(
      prisma,
      resolved.map((r) => r.itemId),
    );
    const stockCheck = assertFairShopStockForLines(resolved, stockMap);
    if (!stockCheck.ok) {
      await recordFairShopUnmetDemandForZeroStockLines(prisma, resolved, stockMap);
      return jsonError(409, 'OUT_OF_STOCK', stockCheck.message, {
        issues: stockCheck.issues,
      });
    }

    const product = await prisma.product.findFirst({
      where: { id: placeholderProductId },
      select: {
        id: true,
        type: true,
        receiveMethod: true,
        status: true,
        isAdminApproved: true,
        salesStartDate: true,
        salesEndDate: true,
        price: true,
        variants: {
          select: {
            optionSignature: true,
            isSoldOut: true,
          },
        },
      },
    });

    if (!product) {
      return jsonError(404, 'PRODUCT_NOT_FOUND', 'QR shop placeholder product was not found.');
    }

    const saleStatus = getSaleStatusByDate(product.salesStartDate, product.salesEndDate);
    if (!product.isAdminApproved) {
      return jsonError(404, 'PLACEHOLDER_NOT_APPROVED', 'QR shop placeholder product is not approved.');
    }
    if (saleStatus !== 'active') {
      return jsonError(404, 'PLACEHOLDER_SALE_INACTIVE', `QR shop placeholder sale is ${saleStatus}.`);
    }
    if (toTypeGroup(product.type) !== 1 || product.receiveMethod !== 1) {
      return jsonError(400, 'INVALID_PRODUCT_CONFIG', 'QR shop product must be Buy Now + pickup.');
    }

    const productType = 1 as const;
    const receiveMethod = 1 as const;
    const paymentMethod = parsedBody.data.paymentMethod;
    const isCounterPay = paymentMethod === 3;
    const bagOption = false;

    const itemRows = resolved.map((row) => {
      const optionData = {
        source: 'qrshop',
        qrItemId: row.itemId,
        optionName: '상품',
        optionValue: row.displayLabel,
        additionalPrice: row.unitPrice,
      };
      if (isMatchedVariantSoldOut(product.variants, optionData)) {
        throw new Error('VARIANT_SOLD_OUT');
      }
      // 금액은 item.json(서버 검증)만 신뢰. 플레이스홀더 Product.price 가 0이 아니어도 Buynow 일반식(product.price+옵션)과 맞추지 않음
      const unitPrice = row.unitPrice;
      return {
        productId: product.id,
        quantity: row.quantity,
        price: unitPrice,
        optionData: toDbJson(optionData),
      };
    });

    let computedPayment = 0;
    for (const row of itemRows) {
      computedPayment += row.price * row.quantity;
    }
    if (computedPayment !== paymentAmount) {
      console.error('[qrshop/orders] amount mismatch', { computedPayment, paymentAmount });
      return jsonError(500, 'SERVER_ERROR', 'order amount validation failed.');
    }

    const orderDateKey = getOrderDateKeyYYMMDD(new Date());

    const createOrderTransaction = () =>
      prisma.$transaction(async (tx) => {
        const sequence = await tx.orderSequence.upsert({
          where: {
            orderDateKey_productType: {
              orderDateKey,
              productType,
            },
          },
          create: {
            orderDateKey,
            productType,
            lastSeq: 1,
          },
          update: {
            lastSeq: { increment: 1 },
          },
          select: { lastSeq: true },
        });

        const orderSeq = sequence.lastSeq;
        if (orderSeq > ORDER_CODE_CONFIG.sequenceMax) {
          throw new Error('ORDER_SEQUENCE_EXCEEDED');
        }
        const productTypeCode = mapProductTypeToOrderCode(productType);
        const orderCode = buildOrderCode({
          orderDateKey,
          productTypeCode,
          orderSeq,
        });

        const order = await tx.order.create({
          data: {
            userId: buyerUserId,
            buyerType,
            buyerGuestTokenHash,
            orderDateKey,
            orderSeq,
            orderCode,
            productType,
            receiveMethod,
            receiverName: null,
            receiverPhone: null,
            deliveryZipCode: null,
            deliveryAddressMain: null,
            deliveryAddressDetail: null,
            deliveryMessage: null,
            ordererName: null,
            ordererPhone: null,
            bagOption,
            paymentMethod,
            billingKey: null,
            cardCompany: isCounterPay ? null : 0,
            bankCode: null,
            easyPayProvider: null,
            paymentStatus: isCounterPay ? 1 : 0,
            fulfillmentStatus: null,
            paymentAmount: computedPayment,
          },
          select: {
            id: true,
            orderCode: true,
            paymentAmount: true,
            productType: true,
            paymentMethod: true,
            paymentStatus: true,
          },
        });

        const createdItems = await Promise.all(
          itemRows.map((row) =>
            tx.orderItem.create({
              data: {
                orderId: order.id,
                productId: row.productId,
                productType,
                quantity: row.quantity,
                price: row.price,
                optionData: row.optionData,
              },
              select: {
                productId: true,
                quantity: true,
                price: true,
                optionData: true,
              },
            }),
          ),
        );

        if (isCounterPay) {
          await fairShopDecrementStockAndWriteHistory(tx, {
            orderId: order.id,
            orderCode,
            paymentMethod,
            paymentAmount: computedPayment,
            resolved,
          });
        }

        return { order, items: createdItems };
      });

    let created: Awaited<ReturnType<typeof createOrderTransaction>> | null = null;
    for (let attempt = 1; attempt <= ORDER_CREATE_MAX_RETRIES; attempt += 1) {
      try {
        created = await createOrderTransaction();
        break;
      } catch (txnError) {
        if (!isRetryableOrderCreateError(txnError)) {
          throw txnError;
        }
        if (attempt >= ORDER_CREATE_MAX_RETRIES) {
          throw new Error('ORDER_CREATE_RETRY_EXCEEDED');
        }
        await sleep(ORDER_CREATE_RETRY_BASE_DELAY_MS * attempt);
      }
    }

    if (!created) {
      throw new Error('ORDER_CREATE_RETRY_EXCEEDED');
    }

    return NextResponse.json({
      status: 'success',
      data: {
        order: {
          ...created.order,
          items: created.items,
        },
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'VARIANT_SOLD_OUT') {
      return jsonError(409, 'INVALID_STATE', 'sold-out variants cannot be ordered.');
    }
    if (error instanceof Error && error.message === 'ORDER_SEQUENCE_EXCEEDED') {
      return jsonError(409, 'ORDER_SEQUENCE_EXCEEDED', 'daily order sequence limit exceeded.');
    }
    if (error instanceof Error && error.message === 'ORDER_CREATE_RETRY_EXCEEDED') {
      return jsonError(409, 'ORDER_CREATE_RETRY_EXCEEDED', 'please retry order creation.');
    }
    if (error instanceof Error && error.message === 'FAIR_SHOP_STOCK_UNDERFLOW') {
      return jsonError(409, 'OUT_OF_STOCK', '재고가 부족합니다. 다시 시도해 주세요.');
    }

    console.error('QR shop order create error:', error);
    return jsonError(500, 'SERVER_ERROR', 'server internal error.');
  }
}
