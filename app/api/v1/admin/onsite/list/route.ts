import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import { formatDateTimePartsInSeoul } from '@/lib/datetime';
import {
  toOnsitePaymentStatusLabel,
  toOnsiteReceiptStatusLabel,
} from '@/lib/admin-onsite-status';

export const dynamic = 'force-dynamic';

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

type OptionLike = {
  value?: unknown;
  optionValue?: unknown;
};

type MappedOrderItem = {
  id: string;
  name: string;
  options: string;
  price: number;
  quantity: number;
};

type MappedOrder = {
  id: string;
  productType: number;
  paymentStatusCode: number;
  fulfillmentStatusCode: number;
  orderId: string;
  orderTime: string;
  fullOrderTime: string;
  orderDateRaw: string;
  paymentStatus: string;
  paymentMethodStr: string;
  paymentAmount: number;
  receiptStatus: string;
  impUid: string;
  bagOption: boolean;
  requiresBagPackaging: boolean;
  bagNoticeMessage: string | null;
  items: MappedOrderItem[];
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

function toPaymentMethodLabel(paymentMethod: number) {
  if (paymentMethod === 3) return '현장결제';
  return '온라인결제';
}

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      if (auth.reason === 'UNAUTHORIZED') return jsonError(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
      return jsonError(403, 'FORBIDDEN', '어드민 권한이 필요합니다.');
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() ?? '';

    const where: any = {
      productType: 1,
      receiveMethod: 1,
      paymentStatus: { in: [0, 1, 2, 3, 4] },
    };

    if (search) {
      where.OR = [
        { orderCode: { contains: search, mode: 'insensitive' } },
        { impUid: { contains: search, mode: 'insensitive' } },
      ];
    }

    const query: any = {
      where,
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { orderDate: 'desc' },
    };

    const orders = (await prisma.order.findMany(query)) as any[];

    const mappedData: MappedOrder[] = orders.map((order) => {
      const { year, month, day, hour, minute } = formatDateTimePartsInSeoul(order.orderDate);
      const YY = year.slice(-2);
      const MM = month;
      const DD = day;
      const HH = hour;
      const mm = minute;

      const paymentStatusCode = Number(order.paymentStatus ?? 0);
      const fulfillmentStatusCode = Number(order.fulfillmentStatus ?? 0);
      const paymentMethodCode = Number(order.paymentMethod ?? 0);

      const paymentStatus = toOnsitePaymentStatusLabel({
        paymentMethod: paymentMethodCode,
        paymentStatus: paymentStatusCode,
        fulfillmentStatus: fulfillmentStatusCode,
      });
      const receiptStatus = toOnsiteReceiptStatusLabel(fulfillmentStatusCode);

      const items: MappedOrderItem[] = Array.isArray(order.items)
        ? order.items.map((item: any) => ({
            id: String(item.id ?? ''),
            name: String(item.product?.name ?? '알 수 없는 상품'),
            options: toOptionQuantityText(item.optionData, Number(item.quantity ?? 1)),
            price: Number(item.price ?? 0),
            quantity: Number(item.quantity ?? 1),
          }))
        : [];

      const hasBagOption = order.bagOption === true;

      return {
        id: String(order.id),
        productType: Number(order.productType ?? 1),
        paymentStatusCode,
        fulfillmentStatusCode,
        orderId: String(order.orderCode ?? String(order.id ?? '').slice(-10).toUpperCase()),
        orderTime: `${HH}:${mm}`,
        fullOrderTime: `${YY}.${MM}.${DD} ${HH}:${mm}`,
        orderDateRaw: `${parseInt(MM, 10)}월 ${parseInt(DD, 10)}일`,
        paymentStatus,
        paymentMethodStr: toPaymentMethodLabel(paymentMethodCode),
        paymentAmount: Number(order.paymentAmount ?? 0),
        receiptStatus,
        // 과거 데이터는 impUid가 비어 있을 수 있어 paymentId(order.id)로 폴백해 화면에 거래 식별값을 노출한다.
        impUid: String(order.impUid ?? order.id ?? '-'),
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
      [] as { date: string; items: MappedOrder[] }[]
    );

    return NextResponse.json({ status: 'success', data: grouped });
  } catch (err) {
    console.error('[Admin Onsite List GET Error]', err);
    return jsonError(500, 'INTERNAL_SERVER_ERROR', '서버 내부 오류가 발생했습니다.');
  }
}

