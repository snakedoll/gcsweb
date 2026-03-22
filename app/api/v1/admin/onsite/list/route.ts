import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

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
        paymentStatus: { in: [1, 2, 3, 4] }, // 1 = 미결제, 2 = 결제완료, 3 = 취소, 4 = 실패
        OR: search
          ? [
              { orderCode: { contains: search, mode: 'insensitive' } },
              { ordererName: { contains: search, mode: 'insensitive' } },
              { ordererPhone: { endsWith: search } },
            ]
          : undefined,
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
      },
      orderBy: { orderDate: 'desc' },
    });

    const mappedData = orders.map((order) => {
      // transform date appropriately for mocked view
      const dateObj = new Date(order.orderDate);
      const YY = String(dateObj.getFullYear()).slice(-2);
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const HH = String(dateObj.getHours()).padStart(2, '0');
      const mmTime = String(dateObj.getMinutes()).padStart(2, '0');

      let paymentStatusStr = '오류';
      if (order.paymentStatus === 1) paymentStatusStr = '미결제';
      if (order.paymentStatus === 2) paymentStatusStr = '결제완료';
      if (order.paymentStatus === 3) paymentStatusStr = '주문취소';
      if (order.paymentStatus === 4) paymentStatusStr = '결제실패';

      let receiptStatusStr = '미수령';
      if (order.fulfillmentStatus === 1) receiptStatusStr = '수령완료';

      let paymentMethodStr = '알수없음';
      switch (order.paymentMethod) {
        case 0: paymentMethodStr = '신용카드'; break;
        case 1: paymentMethodStr = '가상계좌'; break;
        case 2: paymentMethodStr = '간편결제'; break;
        case 3: paymentMethodStr = '카카오페이'; break;
        case 4: paymentMethodStr = '카운터에서 결제'; break;
      }

      const orderItems = order.items.map(item => {
        let options = '';
        if (item.optionData && typeof item.optionData === 'object') {
          try {
            const data = item.optionData as any;
            if (data && data.optionName) {
              options = data.optionName;
            } else if (Array.isArray(data)) {
               options = data.map(o => o.optionName || o.value).join(' / ');
            } else {
               options = JSON.stringify(data);
            }
          } catch(e){}
        }
        return {
          id: item.id,
          name: item.product?.name || '알수없는 상품',
          options: options,
          price: item.price,
          quantity: item.quantity,
        };
      });

      const formatPhone = (phone: string | null) => {
        if (!phone) return '';
        const cleaned = phone.replace(/-/g, '');
        if (cleaned.length === 11) return `${cleaned.slice(0,3)}-${cleaned.slice(3,7)}-${cleaned.slice(7)}`;
        if (cleaned.length === 10) return `${cleaned.slice(0,3)}-${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
        return phone;
      };

      return {
        id: order.id,
        orderId: order.orderCode ?? order.id.slice(-10).toUpperCase(),
        name: order.ordererName,
        phoneLast4: order.ordererPhone ? order.ordererPhone.slice(-4) : '...',
        fullPhone: formatPhone(order.ordererPhone),
        orderTime: `${HH}:${mmTime}`,
        fullOrderTime: `${YY}.${mm}.${dd} ${HH}:${mmTime}`,
        orderDateRaw: `${parseInt(mm, 10)}월 ${parseInt(dd, 10)}일`,
        paymentStatus: paymentStatusStr,
        paymentMethodStr,
        paymentAmount: order.paymentAmount,
        receiptStatus: receiptStatusStr,
        items: orderItems,
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
