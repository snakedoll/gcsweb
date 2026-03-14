import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

// Helper for error responses
function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      if (auth.reason === 'UNAUTHORIZED') {
        return jsonError(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
      }
      return jsonError(403, 'FORBIDDEN', '어드민 권한이 필요합니다.');
    }

    // URL params
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    // fetch all 'Buy Now' orders (productType === 1) and receiveMethod === 1 (현장수령)
    // Buy Now is always 1 (현장수령) but let's query safely
    const orders = await prisma.order.findMany({
      where: {
        productType: 1, // 1 for Buy Now
        receiveMethod: 1, // 1 for 현장수령
        paymentStatus: { in: [1, 2] }, // 1 = 무통장입금대기, 2 = 결제완료
        OR: search
          ? [
              { ordererName: { contains: search, mode: 'insensitive' } },
              { ordererPhone: { endsWith: search } },
            ]
          : undefined,
      },
      include: {
        items: true,
      },
      orderBy: { orderDate: 'desc' },
    });

    const mappedData = orders.map((order) => {
      // transform date appropriately for mocked view
      const dateObj = new Date(order.orderDate);
      const mm = dateObj.getMonth() + 1;
      const dd = dateObj.getDate();
      const HH = String(dateObj.getHours()).padStart(2, '0');
      const mmTime = String(dateObj.getMinutes()).padStart(2, '0');

      let paymentStatusStr = '오류';
      if (order.paymentStatus === 1) paymentStatusStr = '미결제';
      if (order.paymentStatus === 2) paymentStatusStr = '결제완료';

      let receiptStatusStr = '미수령';
      if (order.fulfillmentStatus === 1) receiptStatusStr = '수령완료';

      return {
        id: order.id,
        name: order.ordererName,
        phoneLast4: order.ordererPhone ? order.ordererPhone.slice(-4) : '...',
        orderTime: `${HH}:${mmTime}`,
        orderDateRaw: `${mm}월 ${dd}일`,
        paymentStatus: paymentStatusStr,
        receiptStatus: receiptStatusStr,
      };
    });

    // Grouping logic 
    const grouped = mappedData.reduce((acc, curr) => {
      const g = acc.find(x => x.date === curr.orderDateRaw);
      if (g) {
        g.items.push(curr);
      } else {
        acc.push({ date: curr.orderDateRaw, items: [curr] });
      }
      return acc;
    }, [] as { date: string, items: typeof mappedData }[]);

    return NextResponse.json({
      status: 'success',
      data: grouped,
    });
  } catch (err: any) {
    console.error('[Admin Onsite List GET Error]', err);
    return jsonError(500, 'INTERNAL_SERVER_ERROR', '서버 내부 오류가 발생했습니다.');
  }
}
