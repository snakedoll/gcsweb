import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getPortonePaymentConfig, isPortoneConfigured } from '@/lib/payment/portone';

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

type Params = { params: { orderId: string } };

/**
 * Buy Now 주문 → 포트원 결제창용 파라미터 반환.
 * 클라이언트는 @portone/browser-sdk requestPayment() 호출.
 */
export async function GET(
  _request: Request,
  { params }: Params,
) {
  try {
    const orderId = params.orderId;
    if (!orderId || typeof orderId !== 'string') {
      return jsonError(400, 'INVALID_INPUT', 'orderId is required.');
    }

    if (!isPortoneConfigured()) {
      return jsonError(503, 'PAYMENT_NOT_CONFIGURED', 'PortOne env not set.');
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, productType: { in: [0, 1] }, paymentStatus: 0 },
      select: {
        id: true,
        productType: true,
        paymentAmount: true,
        ordererName: true,
        ordererPhone: true,
        items: {
          take: 1,
          select: {
            product: { select: { name: true } },
          },
        },
      },
    });

    if (!order) {
      return jsonError(404, 'ORDER_NOT_FOUND', 'order not found or not eligible.');
    }

    const { storeId, channelKey } = getPortonePaymentConfig();
    const goodname =
      order.items[0]?.product?.name?.slice(0, 80) ??
      (order.productType === 0 ? 'Fund 주문' : 'Buy Now 주문');

    const baseUrl =
      process.env.NEXTAUTH_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    return NextResponse.json({
      status: 'success',
      data: {
        storeId,
        channelKey,
        paymentId: order.id,
        orderName: goodname,
        totalAmount: order.paymentAmount,
        currency: 'CURRENCY_KRW',
        payMethod: 'CARD',
        redirectUrl: `${baseUrl}/shop/orders/buynow/result`,
        buyerName: order.ordererName,
        buyerTel: order.ordererPhone,
      },
    });
  } catch (error) {
    console.error('PortOne payment params error:', error);
    return jsonError(500, 'SERVER_ERROR', 'server internal error.');
  }
}
