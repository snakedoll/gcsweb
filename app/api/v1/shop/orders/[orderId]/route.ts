import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

function hashGuestToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

type Params = {
  params: { orderId: string };
};

export async function GET(request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    const sessionEmail = session?.user?.email ?? null;

    let user: { id: string } | null = null;
    if (sessionEmail) {
      user = await prisma.user.findFirst({ where: { email: sessionEmail },
        select: { id: true },
      });
    }

    const orderId = params.orderId;
    if (!orderId || typeof orderId !== 'string') {
      return jsonError(400, 'INVALID_INPUT', 'orderId is required.');
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
      },
      select: {
        id: true,
        userId: true,
        buyerType: true,
        buyerGuestTokenHash: true,
        productType: true,
        receiveMethod: true,
        receiverName: true,
        receiverPhone: true,
        deliveryZipCode: true,
        deliveryAddressMain: true,
        deliveryAddressDetail: true,
        deliveryMessage: true,
        ordererName: true,
        ordererPhone: true,
        bagOption: true,
        paymentMethod: true,
        cardCompany: true,
        bankCode: true,
        easyPayProvider: true,
        paymentStatus: true,
        fulfillmentStatus: true,
        paymentAmount: true,
        createdAt: true,
        items: {
          select: {
            productId: true,
            quantity: true,
            price: true,
            optionData: true,
          },
        },
      },
    });

    if (!order) {
      return jsonError(404, 'ORDER_NOT_FOUND', 'order not found.');
    }

    if (order.buyerType === 'USER') {
      if (!user || order.userId !== user.id) {
        return jsonError(404, 'ORDER_NOT_FOUND', 'order not found.');
      }
    } else {
      const rawGuestToken = request.headers.get('x-guest-token')?.trim() ?? '';
      if (!rawGuestToken) {
        return jsonError(400, 'GUEST_TOKEN_REQUIRED', 'x-guest-token is required for guest order.');
      }
      const hashedGuestToken = hashGuestToken(rawGuestToken);
      if (!order.buyerGuestTokenHash || order.buyerGuestTokenHash !== hashedGuestToken) {
        return jsonError(404, 'ORDER_NOT_FOUND', 'order not found.');
      }
    }

    const { buyerGuestTokenHash: _buyerGuestTokenHash, ...safeOrder } = order;

    return NextResponse.json({
      status: 'success',
      data: { order: safeOrder },
    });
  } catch (error) {
    console.error('Shop order detail error:', error);
    return jsonError(500, 'SERVER_ERROR', 'server internal error.');
  }
}
