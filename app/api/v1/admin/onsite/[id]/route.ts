import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

export async function GET(
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

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true, 
              }
            }
          }
        }
      }
    });

    if (!order) {
      return jsonError(404, 'NOT_FOUND', '해당 주문을 찾을 수 없습니다.');
    }

    const dateObj = new Date(order.orderDate);
    const YY = dateObj.getFullYear();
    const MM = String(dateObj.getMonth() + 1).padStart(2, '0');
    const DD = String(dateObj.getDate()).padStart(2, '0');

    let paymentMethodStr = '알수없음';
    switch (order.paymentMethod) {
      case 0: paymentMethodStr = '신용카드'; break;
      case 1: paymentMethodStr = '가상계좌'; break;
      case 2: paymentMethodStr = '간편결제'; break;
      default: paymentMethodStr = '기타';
    }

    const formattedData = {
      id: order.id,
      orderDate: `${YY}. ${MM}. ${DD}`,
      items: order.items.map(item => ({
        id: item.id,
        name: item.product?.name || '알수없는 상품',
        option: item.optionData || '단일 상품', 
        price: item.price,
        quantity: item.quantity,
        imgUrl: item.product?.images?.[0]?.thumbnailImgUrl || null,
      })),
      customer: {
        name: order.ordererName,
        phone: order.ordererPhone,
      },
      payment: {
        method: paymentMethodStr,
        amount: `${order.paymentAmount.toLocaleString()}원`,
      },
      fulfillmentStatus: order.fulfillmentStatus === 1 ? '수령완료' : '미수령',
    };

    return NextResponse.json({
      status: 'success',
      data: formattedData,
    });
  } catch (err: any) {
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

    const body = await req.json().catch(() => ({}));
    const { fulfillmentStatus } = body;

    // fulfillmentStatus: 0 for 미수령, 1 for 수령완료
    if (fulfillmentStatus !== 0 && fulfillmentStatus !== 1) {
      return jsonError(400, 'INVALID_INPUT', '잘못된 수령 상태값입니다.');
    }

    const targetOrder = await prisma.order.findUnique({
      where: { id }
    });

    if (!targetOrder) {
      return jsonError(404, 'NOT_FOUND', '해당 주문을 찾을 수 없습니다.');
    }

    await prisma.order.update({
      where: { id },
      data: {
        fulfillmentStatus,
        // 수령 완료 처리 시 결제 상태도 완료로 자동 변경 (현장 결제 케이스 대응)
        ...(fulfillmentStatus === 1 ? { paymentStatus: 2 } : {}),
      }
    });

    return NextResponse.json({
      status: 'success',
      message: '수령 상태가 변경되었습니다.',
    });

  } catch (err: any) {
    console.error('[Admin Onsite Detail PATCH Error]', err);
    return jsonError(500, 'INTERNAL_SERVER_ERROR', '서버 내부 오류가 발생했습니다.');
  }
}
