import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * 이니시스 모바일 결제 완료 후 리다이렉트 수신 (P_NEXT_URL / P_NOTI_URL).
 * GET 또는 POST로 호출되며, P_STATUS=00 이면 결제 성공으로 처리.
 */

export async function GET(request: Request) {
  const url = new URL(request.url);
  return handleReturn({
    pStatus: url.searchParams.get('P_STATUS') ?? '',
    pTid: url.searchParams.get('P_TID') ?? '',
    pOid: url.searchParams.get('P_OID') ?? '',
    pAmt: url.searchParams.get('P_AMT') ?? '',
    pRmesg: url.searchParams.get('P_RMESG1') ?? '',
  }, request.url);
}

export async function POST(request: Request) {
  const fd = await request.formData();
  return handleReturn({
    pStatus: (fd.get('P_STATUS') as string) ?? '',
    pTid: (fd.get('P_TID') as string) ?? '',
    pOid: (fd.get('P_OID') as string) ?? '',
    pAmt: (fd.get('P_AMT') as string) ?? '',
    pRmesg: (fd.get('P_RMESG1') as string) ?? '',
  }, request.url);
}

async function handleReturn(
  p: { pStatus: string; pTid: string; pOid: string; pAmt: string; pRmesg: string },
  requestUrl: string,
) {
  const origin = new URL(requestUrl).origin;
  const isSuccess = p.pStatus === '00';

  if (isSuccess && p.pOid) {
    try {
      const order = await prisma.order.findFirst({
        where: { id: p.pOid, productType: 1 },
        select: { id: true, paymentAmount: true, paymentStatus: true },
      });

      if (order && order.paymentStatus === 0) {
        if (String(order.paymentAmount) === p.pAmt) {
          await prisma.order.update({
            where: { id: p.pOid },
            data: { paymentStatus: 1 },
          });
        } else {
          console.warn(`[inicis/return] amount mismatch: order=${order.paymentAmount}, P_AMT=${p.pAmt}`);
        }
      }
    } catch (error) {
      console.error('[inicis/return] DB update error:', error);
    }
  }

  const resultPath = isSuccess
    ? `/shop/orders/buynow/result?status=success&orderId=${encodeURIComponent(p.pOid)}`
    : `/shop/orders/buynow/result?status=fail&message=${encodeURIComponent(p.pRmesg || '결제가 완료되지 않았습니다.')}${p.pOid ? '&orderId=' + encodeURIComponent(p.pOid) : ''}`;

  return NextResponse.redirect(new URL(resultPath, origin));
}
