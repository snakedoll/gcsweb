import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createOrderSchema } from '@/lib/validations/order';

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

function extractAdditionalPrice(optionData: unknown): number {
  const list = Array.isArray(optionData) ? optionData : optionData && typeof optionData === 'object' ? [optionData] : [];
  return list.reduce((sum, item) => {
    if (!item || typeof item !== 'object') return sum;
    const value = (item as Record<string, unknown>).additionalPrice;
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? sum + parsed : sum;
  }, 0);
}

function toDbJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === undefined || value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sessionEmail = session?.user?.email ?? null;

    const body = await request.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return jsonError(400, 'INVALID_INPUT', firstIssue?.message ?? 'invalid request body');
    }

    const data = parsed.data;
    const isFund = data.productType === 0;
    const isFundDelivery = data.productType === 0 && data.receiveMethod === 0;
    const isFundPickup = data.productType === 0 && data.receiveMethod === 1;
    const isBuyNow = data.productType === 1;

    let user:
      | {
          id: string;
          name: string;
          phone: string | null;
        }
      | null = null;

    if (sessionEmail) {
      user = await prisma.user.findUnique({
        where: { email: sessionEmail },
        select: { id: true, name: true, phone: true },
      });
    }

    if (isFund && !user) {
      return jsonError(400, 'FUND_LOGIN_REQUIRED', 'fund orders require login.');
    }

    const productIds = [...new Set(data.items.map((item) => item.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        type: true,
        receiveMethod: true,
        status: true,
        isPublic: true,
        isAdminApproved: true,
        salesStartDate: true,
        salesEndDate: true,
        price: true,
      },
    });

    if (products.length !== productIds.length) {
      return jsonError(404, 'PRODUCT_NOT_FOUND', 'one or more products were not found.');
    }

    const productMap = new Map(products.map((product) => [product.id, product]));
    const now = new Date();

    for (const product of products) {
      if (!product.isPublic || !product.isAdminApproved || product.status !== 1) {
        return jsonError(404, 'PRODUCT_NOT_FOUND', 'one or more products were not available.');
      }
      if (product.salesStartDate > now || product.salesEndDate < now) {
        return jsonError(400, 'PRODUCT_NOT_AVAILABLE', 'one or more products are outside sales period.');
      }
      if (product.type !== data.productType) {
        return jsonError(400, 'INVALID_PRODUCT_TYPE', 'productType does not match the requested products.');
      }
      if (product.receiveMethod !== data.receiveMethod) {
        return jsonError(400, 'INVALID_RECEIVE_METHOD', 'receiveMethod does not match product configuration.');
      }
    }

    if (isFund && data.paymentMethod === 2) {
      return jsonError(400, 'INVALID_PAYMENT_METHOD', 'easy pay is not allowed for fund.');
    }

    if (isBuyNow && data.receiveMethod !== 1) {
      return jsonError(400, 'INVALID_RECEIVE_METHOD', 'buyNow supports pickup only.');
    }

    if ((isBuyNow || isFundPickup) && data.isPolicyAgreed !== true) {
      return jsonError(400, 'POLICY_AGREEMENT_REQUIRED', 'policy agreement is required.');
    }

    let paymentAmount = 0;
    const itemRows = data.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new Error('PRODUCT_NOT_FOUND');
      }
      const unitPrice = product.price + extractAdditionalPrice(item.optionData);
      paymentAmount += unitPrice * item.quantity;
      return {
        productId: item.productId,
        quantity: item.quantity,
        price: unitPrice,
        optionData: toDbJson(item.optionData),
      };
    });

    const ordererName = data.ordererName?.trim() || user?.name || '';
    const ordererPhone = data.ordererPhone?.trim() || user?.phone || '';
    if (!ordererName || !ordererPhone) {
      return jsonError(400, 'INVALID_INPUT', 'ordererName and ordererPhone are required.');
    }

    const created = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId: user?.id ?? null,
          productType: data.productType,
          receiveMethod: data.receiveMethod,
          receiverName: isFund ? data.receiverName ?? null : null,
          receiverPhone: isFund ? data.receiverPhone ?? null : null,
          deliveryZipCode: isFundDelivery ? data.deliveryZipCode ?? null : null,
          deliveryAddressMain: isFundDelivery ? data.deliveryAddressMain ?? null : null,
          deliveryAddressDetail: isFundDelivery ? data.deliveryAddressDetail ?? null : null,
          deliveryMessage: isFundDelivery ? data.deliveryMessage ?? null : null,
          ordererName,
          ordererPhone,
          paymentMethod: data.paymentMethod,
          paymentStatus: 0,
          fulfillmentStatus: null,
          paymentAmount,
        },
        select: {
          id: true,
          productType: true,
          receiveMethod: true,
          paymentMethod: true,
          paymentStatus: true,
          fulfillmentStatus: true,
          paymentAmount: true,
          createdAt: true,
        },
      });

      const createdItems = await Promise.all(
        itemRows.map((row) =>
          tx.orderItem.create({
            data: {
              orderId: order.id,
              productId: row.productId,
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
          })
        )
      );

      return { order, items: createdItems };
    });

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
    if (error instanceof Error && error.message === 'PRODUCT_NOT_FOUND') {
      return jsonError(404, 'PRODUCT_NOT_FOUND', 'one or more products were not found.');
    }

    const message = error instanceof Error ? error.message : '';
    if (message.includes('fund order can contain only one distinct productId')) {
      return jsonError(400, 'FUND_SINGLE_PRODUCT_ONLY', 'fund orders can contain only one product.');
    }

    console.error('Shop order create error:', error);
    return jsonError(500, 'SERVER_ERROR', 'server internal error.');
  }
}
