import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

function toPaymentMethodLabel(paymentMethod: number): string {
  if (paymentMethod === 0 || paymentMethod === 1 || paymentMethod === 2) return '온라인결제';
  if (paymentMethod === 3 || paymentMethod === 4) return '현장결제';
  return '기타';
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

    const isCanceled = order.paymentStatus === 3;
    const fulfillmentStatus = order.fulfillmentStatus === 1 ? 'RECEIVED' : 'NOT_RECEIVED';

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
        name: item.product?.name ?? '알수없는 상품',
        option: item.optionData ?? '단일 상품',
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

    if (paymentStatus === 3) {
      if (targetOrder.paymentStatus === 3) {
        return NextResponse.json({
          status: 'success',
          message: '주문취소완료',
        });
      }

      const updated = await prisma.order.updateMany({
        where: { id },
        data: { paymentStatus: 3 },
      });

      if (updated.count < 1) {
        return jsonError(404, 'NOT_FOUND', '해당 주문을 찾을 수 없습니다.');
      }

      return NextResponse.json({
        status: 'success',
        message: '주문취소완료',
      });
    }

    // fulfillmentStatus: 0 for 미수령, 1 for 수령완료
    if (fulfillmentStatus !== 0 && fulfillmentStatus !== 1) {
      return jsonError(400, 'INVALID_INPUT', '잘못된 수령 상태값입니다.');
    }

    await prisma.order.update({
      where: { id },
      data: {
        fulfillmentStatus,
        // 수령 완료 처리 시 결제 상태도 완료로 자동 변경 (현장 결제 케이스 대응)
        ...(fulfillmentStatus === 1 && targetOrder.paymentStatus !== 3 ? { paymentStatus: 2 } : {}),
      },
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
