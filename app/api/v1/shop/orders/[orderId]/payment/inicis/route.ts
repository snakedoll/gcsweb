import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { buildInicisMobileParams, getInicisGatewayUrl, resolveIniPayment } from '@/lib/payment/inicis';

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

type Params = { params: { orderId: string } };

/**
 * Buy Now 주문 → 이니시스 모바일 결제 파라미터 + 게이트웨이 URL 반환.
 * 클라이언트는 gatewayUrl로 params를 form POST한다.
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const orderId = params.orderId;
    if (!orderId || typeof orderId !== 'string') {
      return jsonError(400, 'INVALID_INPUT', 'orderId is required.');
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        productType: 1,
        paymentStatus: 0,
      },
      select: {
        id: true,
        paymentAmount: true,
        paymentMethod: true,
        easyPayProvider: true,
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
      return jsonError(404, 'ORDER_NOT_FOUND', 'order not found or not eligible for payment.');
    }

    const gatewayUrl = getInicisGatewayUrl();
    if (!gatewayUrl) {
      return jsonError(503, 'PAYMENT_NOT_CONFIGURED', 'KG_INICIS_GATEWAY_URL is not set.');
    }

    const goodname =
      order.items[0]?.product?.name?.slice(0, 80) ?? 'Buy Now 주문';
    const { pIniPayment, pReserved } = resolveIniPayment(
      order.paymentMethod,
      order.easyPayProvider,
    );
    const paymentParams = buildInicisMobileParams({
      orderId: order.id,
      amount: order.paymentAmount,
      goodname,
      buyername: order.ordererName,
      buyertel: order.ordererPhone,
      buyeremail: '',
      pIniPayment,
      pReserved,
    });

    if (!paymentParams) {
      return jsonError(503, 'PAYMENT_NOT_CONFIGURED', 'Inicis config incomplete.');
    }

    return NextResponse.json({
      status: 'success',
      data: { gatewayUrl, params: paymentParams },
    });
  } catch (error) {
    console.error('Inicis payment params error:', error);
    return jsonError(500, 'SERVER_ERROR', 'server internal error.');
  }
}
