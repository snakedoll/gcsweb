import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

type OptionLike = {
  value?: unknown;
  optionValue?: unknown;
};

function extractOptionValues(optionData: unknown): string[] {
  if (Array.isArray(optionData)) {
    return optionData
      .map((row) => {
        if (row && typeof row === 'object') {
          const option = row as OptionLike;
          const candidate = option.optionValue ?? option.value ?? '';
          return String(candidate).trim();
        }
        if (typeof row === 'string') return row.trim();
        return '';
      })
      .filter(Boolean);
  }

  if (optionData && typeof optionData === 'object') {
    return extractOptionValues([optionData]);
  }

  if (typeof optionData === 'string') {
    const trimmed = optionData.trim();
    if (!trimmed) return [];
    try {
      return extractOptionValues(JSON.parse(trimmed));
    } catch {
      return [trimmed];
    }
  }

  return [];
}

function toOptionQuantityText(optionData: unknown, quantity: number): string {
  const values = extractOptionValues(optionData);
  if (values.length === 0) return `${quantity}개`;
  return `${values.join(' · ')} / ${quantity}개`;
}

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      if (auth.reason === 'UNAUTHORIZED') return jsonError(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
      return jsonError(403, 'FORBIDDEN', '어드민 권한이 필요합니다.');
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    const orders = await prisma.order.findMany({
      where: {
        productType: 1,
        receiveMethod: 1,
        paymentStatus: { in: [1, 2, 3, 4] },
        OR: search
          ? [
              { orderCode: { contains: search, mode: 'insensitive' } },
              { impUid: { contains: search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { orderDate: 'desc' },
    });

    const mappedData = orders.map((order) => {
      const dateObj = new Date(order.orderDate);
      const YY = String(dateObj.getFullYear()).slice(-2);
      const MM = String(dateObj.getMonth() + 1).padStart(2, '0');
      const DD = String(dateObj.getDate()).padStart(2, '0');
      const HH = String(dateObj.getHours()).padStart(2, '0');
      const mm = String(dateObj.getMinutes()).padStart(2, '0');

      let paymentStatusStr = '오류';
      if (order.paymentStatus === 1) paymentStatusStr = '미결제';
      if (order.paymentStatus === 2) paymentStatusStr = '결제완료';
      if (order.paymentStatus === 3) paymentStatusStr = '주문취소';
      if (order.paymentStatus === 4) paymentStatusStr = '결제실패';

      const receiptStatusStr = order.fulfillmentStatus === 1 ? '수령완료' : '미수령';

      let paymentMethodStr = '알수없음';
      if ([0, 1, 2].includes(order.paymentMethod)) paymentMethodStr = '온라인결제';
      if ([3, 4].includes(order.paymentMethod)) paymentMethodStr = '현장결제';

      const items = order.items.map((item) => ({
        id: item.id,
        name: item.product?.name ?? '알수없는 상품',
        options: toOptionQuantityText(item.optionData, item.quantity),
        price: item.price,
        quantity: item.quantity,
      }));

      const hasBagOption = (order as { bagOption?: boolean }).bagOption === true;

      return {
        id: order.id,
        productType: order.productType,
        orderId: order.orderCode ?? order.id.slice(-10).toUpperCase(),
        orderTime: `${HH}:${mm}`,
        fullOrderTime: `${YY}.${MM}.${DD} ${HH}:${mm}`,
        orderDateRaw: `${parseInt(MM, 10)}월 ${parseInt(DD, 10)}일`,
        paymentStatus: paymentStatusStr,
        paymentMethodStr,
        paymentAmount: order.paymentAmount,
        receiptStatus: receiptStatusStr,
        impUid: order.impUid ?? '-',
        bagOption: hasBagOption,
        requiresBagPackaging: hasBagOption,
        bagNoticeMessage: hasBagOption ? '봉투에 담아주세요' : null,
        items,
      };
    });

    const grouped = mappedData.reduce(
      (acc, curr) => {
        const found = acc.find((x) => x.date === curr.orderDateRaw);
        if (found) found.items.push(curr);
        else acc.push({ date: curr.orderDateRaw, items: [curr] });
        return acc;
      },
      [] as { date: string; items: typeof mappedData }[]
    );

    return NextResponse.json({ status: 'success', data: grouped });
  } catch (err) {
    console.error('[Admin Onsite List GET Error]', err);
    return jsonError(500, 'INTERNAL_SERVER_ERROR', '서버 내부 오류가 발생했습니다.');
  }
}
