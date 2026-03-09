import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getPayment } from '@/lib/payment/portone';

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

type Params = { params: { orderId: string } };

/**
 * 포트원 결제 결과 검증.
 * 결제창 리다이렉트 후 클라이언트에서 paymentId로 호출.
 * 금액 일치·상태 확인 후 paymentStatus=1 갱신.
 */
export async function POST(_request: Request, { params }: Params) {
  try {
    const orderId = params.orderId;
    if (!orderId || typeof orderId !== 'string') {
      return jsonError(400, 'INVALID_INPUT', 'orderId is required.');
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, productType: 1 },
      select: { id: true, paymentAmount: true, paymentStatus: true },
    });

    if (!order) {
      return jsonError(404, 'ORDER_NOT_FOUND', 'order not found.');
    }

    if (order.paymentStatus === 1) {
      return NextResponse.json({
        status: 'success',
        data: { verified: true, alreadyPaid: true },
      });
    }

    const payment = await getPayment(orderId);
    if (!payment.success || !payment.amount || !payment.status) {
      return NextResponse.json({
        status: 'success',
        data: {
          verified: false,
          code: payment.code,
          message: payment.message ?? '결제 확인 실패',
        },
      });
    }

    const expectedTotal = order.paymentAmount;
    const actualTotal = payment.amount?.total ?? 0;
    if (actualTotal !== expectedTotal) {
      return NextResponse.json({
        status: 'success',
        data: {
          verified: false,
          message: '결제 금액이 일치하지 않습니다.',
        },
      });
    }

    if (payment.status === 'PAID' || payment.status === 'VIRTUAL_ACCOUNT_ISSUED') {
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 1 },
      });
    }

    return NextResponse.json({
      status: 'success',
      data: {
        verified: payment.status === 'PAID' || payment.status === 'VIRTUAL_ACCOUNT_ISSUED',
        status: payment.status,
      },
    });
  } catch (error) {
    console.error('PortOne verify error:', error);
    return jsonError(500, 'SERVER_ERROR', 'server internal error.');
  }
}
