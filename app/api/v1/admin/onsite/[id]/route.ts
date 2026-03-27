import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import {
  ONSITE_FULFILLMENT_STATUS,
  ONSITE_PAYMENT_STATUS,
  isCounterPaymentMethod,
} from '@/lib/admin-onsite-status';

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

function toPaymentMethodLabel(paymentMethod: number): string {
  return isCounterPaymentMethod(paymentMethod) ? '현장결제' : '온라인결제';
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      if (auth.reason === 'UNAUTHORIZED') return jsonError(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
      return jsonError(403, 'FORBIDDEN', '어드민 권한이 필요합니다.');
    }

    const { id } = params;
    if (!id) return jsonError(400, 'INVALID_INPUT', '주문 ID가 없습니다.');

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return jsonError(404, 'NOT_FOUND', '해당 주문을 찾을 수 없습니다.');
    }

    const dateObj = new Date(order.orderDate);
    const YYYY = dateObj.getFullYear();
    const MM = String(dateObj.getMonth() + 1).padStart(2, '0');
    const DD = String(dateObj.getDate()).padStart(2, '0');
    const HH = String(dateObj.getHours()).padStart(2, '0');
    const mm = String(dateObj.getMinutes()).padStart(2, '0');

    const isCanceled = order.paymentStatus === ONSITE_PAYMENT_STATUS.CANCELED;
    const fulfillmentStatus =
      order.fulfillmentStatus === ONSITE_FULFILLMENT_STATUS.RECEIVED ? 'RECEIVED' : 'NOT_RECEIVED';

    const formattedData = {
      id: order.id,
      orderCode: order.orderCode ?? order.id.slice(-10).toUpperCase(),
      impUid: order.impUid ?? '-',
      orderDate: `${YYYY}. ${MM}. ${DD} ${HH}:${mm}`,
      isCanceled,
      paymentStatus: order.paymentStatus,
      bagOption: order.bagOption,
      requiresBagPackaging: order.bagOption === true,
      bagNoticeMessage: order.bagOption === true ? '봉투에 담아주세요' : null,
      items: order.items.map((item) => ({
        id: item.id,
        name: item.product?.name ?? '알 수 없는 상품',
        option: item.optionData ?? '옵션 없음',
        price: item.price,
        quantity: item.quantity,
        imgUrl: item.product?.images?.[0]?.thumbnailImgUrl ?? null,
      })),
      payment: {
        method: toPaymentMethodLabel(order.paymentMethod),
        amount: `${order.paymentAmount.toLocaleString()}원`,
      },
      fulfillmentStatus,
      actionButtonState: isCanceled ? 'CANCELED' : fulfillmentStatus,
    };

    return NextResponse.json({
      status: 'success',
      data: formattedData,
    });
  } catch (err) {
    console.error('[Admin Onsite Detail GET Error]', err);
    return jsonError(500, 'INTERNAL_SERVER_ERROR', '서버 내부 오류가 발생했습니다.');
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      if (auth.reason === 'UNAUTHORIZED') return jsonError(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
      return jsonError(403, 'FORBIDDEN', '어드민 권한이 필요합니다.');
    }

    const { id } = params;
    if (!id) return jsonError(400, 'INVALID_INPUT', '주문 ID가 없습니다.');

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const rawFulfillmentStatus = (body as Record<string, unknown>).fulfillmentStatus;
    const rawPaymentStatus = (body as Record<string, unknown>).paymentStatus;

    const fulfillmentStatus =
      typeof rawFulfillmentStatus === 'number'
        ? rawFulfillmentStatus
        : typeof rawFulfillmentStatus === 'string'
          ? Number(rawFulfillmentStatus)
          : undefined;

    const paymentStatus =
      typeof rawPaymentStatus === 'number'
        ? rawPaymentStatus
        : typeof rawPaymentStatus === 'string'
          ? Number(rawPaymentStatus)
          : undefined;

    const targetOrder = await prisma.order.findUnique({ where: { id } });
    if (!targetOrder) {
      return jsonError(404, 'NOT_FOUND', '해당 주문을 찾을 수 없습니다.');
    }

    // 주문취소는 비가역 처리
    if (paymentStatus === ONSITE_PAYMENT_STATUS.CANCELED) {
      if (targetOrder.paymentStatus === ONSITE_PAYMENT_STATUS.CANCELED) {
        return NextResponse.json({ status: 'success', message: '주문취소완료' });
      }

      await prisma.order.update({
        where: { id },
        data: { paymentStatus: ONSITE_PAYMENT_STATUS.CANCELED },
      });

      return NextResponse.json({ status: 'success', message: '주문취소완료' });
    }

    if (
      fulfillmentStatus !== ONSITE_FULFILLMENT_STATUS.NOT_RECEIVED &&
      fulfillmentStatus !== ONSITE_FULFILLMENT_STATUS.RECEIVED
    ) {
      return jsonError(400, 'INVALID_INPUT', '잘못된 수령 상태값입니다.');
    }

    if (targetOrder.paymentStatus === ONSITE_PAYMENT_STATUS.CANCELED) {
      return jsonError(400, 'INVALID_INPUT', '주문취소 상태에서는 수령 상태를 변경할 수 없습니다.');
    }

    const updateData: { fulfillmentStatus: number; paymentStatus?: number } = {
      fulfillmentStatus,
    };

    // 현장결제 규칙
    // 미수령 -> 수령완료 : 결제완료
    // 수령완료 -> 미수령 : 미결제
    if (isCounterPaymentMethod(targetOrder.paymentMethod)) {
      updateData.paymentStatus =
        fulfillmentStatus === ONSITE_FULFILLMENT_STATUS.RECEIVED
          ? ONSITE_PAYMENT_STATUS.PAID
          : ONSITE_PAYMENT_STATUS.UNPAID;
    }

    await prisma.order.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      status: 'success',
      message: '수령 상태가 변경되었습니다.',
    });
  } catch (err) {
    console.error('[Admin Onsite Detail PATCH Error]', err);
    return jsonError(500, 'INTERNAL_SERVER_ERROR', '서버 내부 오류가 발생했습니다.');
  }
}
