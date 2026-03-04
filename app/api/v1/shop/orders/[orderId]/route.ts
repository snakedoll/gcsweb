import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

type Params = {
  params: { orderId: string };
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    const sessionEmail = session?.user?.email ?? null;
    if (!sessionEmail) {
      return jsonError(401, 'UNAUTHORIZED', 'authentication required.');
    }

    const user = await prisma.user.findFirst({ where: { email: sessionEmail },
      select: { id: true },
    });
    if (!user) {
      return jsonError(401, 'UNAUTHORIZED', 'authentication required.');
    }

    const orderId = params.orderId;
    if (!orderId || typeof orderId !== 'string') {
      return jsonError(400, 'INVALID_INPUT', 'orderId is required.');
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: user.id,
      },
      select: {
        id: true,
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

    return NextResponse.json({
      status: 'success',
      data: { order },
    });
  } catch (error) {
    console.error('Shop order detail error:', error);
    return jsonError(500, 'SERVER_ERROR', 'server internal error.');
  }
}
