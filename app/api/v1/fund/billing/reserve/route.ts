import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { cancelV1Payment, getBillingAuthAmount, issueBillingKeyWithOnetime } from '@/lib/payment/portone';
import { apiError as jsonError } from '@/lib/api-response';

type ReserveRequestBody = {
  customerUid?: unknown;
  cardNumber?: unknown;
  expiry?: unknown;
  birth?: unknown;
  pwd2digit?: unknown;
  buyerName?: unknown;
  buyerTel?: unknown;
  buyerEmail?: unknown;
};

function toText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeExpiry(value: string) {
  const onlyDigits = value.replace(/\D/g, '');
  if (onlyDigits.length === 4) return onlyDigits;
  if (onlyDigits.length === 6 && onlyDigits.startsWith('20')) return onlyDigits.slice(2);
  return '';
}

function getCancelDelayMs(): number {
  const raw = process.env.FUND_BILLING_CANCEL_DELAY_MS?.trim();
  if (!raw) return 2000;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 10000) : 2000;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sessionEmail = session?.user?.email ?? null;
    if (!sessionEmail) {
      return jsonError(401, 'UNAUTHORIZED', 'authentication required.');
    }

    const body = (await request.json().catch(() => ({}))) as ReserveRequestBody;
    const customerUid = toText(body.customerUid);
    const cardNumber = toText(body.cardNumber).replace(/\D/g, '');
    const expiry = normalizeExpiry(toText(body.expiry));
    const birth = toText(body.birth).replace(/\D/g, '');
    const pwd2digit = toText(body.pwd2digit).replace(/\D/g, '');
    const buyerName = toText(body.buyerName);
    const buyerTel = toText(body.buyerTel);
    const buyerEmail = toText(body.buyerEmail) || undefined;

    if (!customerUid || customerUid.length < 6 || customerUid.length > 60) {
      return jsonError(400, 'INVALID_CUSTOMER_UID', 'customerUid is invalid.');
    }
    if (!/^\d{14,19}$/.test(cardNumber)) {
      return jsonError(400, 'INVALID_CARD_NUMBER', 'cardNumber is invalid.');
    }
    if (!/^\d{4}$/.test(expiry)) {
      return jsonError(400, 'INVALID_EXPIRY', 'expiry is invalid.');
    }
    if (!/^\d{6}$/.test(birth)) {
      return jsonError(400, 'INVALID_BIRTH', 'birth is invalid.');
    }
    if (!/^\d{2}$/.test(pwd2digit)) {
      return jsonError(400, 'INVALID_PWD2DIGIT', 'pwd2digit is invalid.');
    }
    if (!buyerName) {
      return jsonError(400, 'INVALID_BUYER_NAME', 'buyerName is required.');
    }
    if (!buyerTel) {
      return jsonError(400, 'INVALID_BUYER_TEL', 'buyerTel is required.');
    }

    const merchantUid = `fund-reserve-${Date.now()}`;
    const issueResult = await issueBillingKeyWithOnetime({
      customerUid,
      merchantUid,
      cardNumber,
      expiry,
      birth,
      pwd2digit,
      buyerName,
      buyerTel,
      buyerEmail,
    });
    if (!issueResult.success || !issueResult.impUid) {
      return jsonError(400, issueResult.code ?? 'BILLING_ISSUE_FAILED', issueResult.message ?? '빌링키 예약 등록에 실패했습니다.');
    }

    const authAmount = getBillingAuthAmount();
    const cancelParams = {
      impUid: issueResult.impUid,
      amount: authAmount,
      reason: 'Fund 예약 결제 등록 즉시취소',
      merchantUid,
    };

    const cancelDelaysMs = [getCancelDelayMs(), 3000, 5000];
    await new Promise((resolve) => setTimeout(resolve, cancelDelaysMs[0]));

    let cancelResult = await cancelV1Payment(cancelParams);
    let attempt = 0;

    while (!cancelResult.success && attempt < cancelDelaysMs.length - 1) {
      attempt += 1;
      await new Promise((resolve) => setTimeout(resolve, cancelDelaysMs[attempt]));
      cancelResult = await cancelV1Payment(cancelParams);
    }

    if (!cancelResult.success) {
      console.warn('[FundBillingReserve] cancel failed after onetime success (재시도 후에도 실패, 빌링키는 저장하고 성공 처리)', {
        customerUid,
        merchantUid,
        impUid: issueResult.impUid,
        attempts: attempt + 1,
        code: cancelResult.code ?? null,
        message: cancelResult.message ?? null,
      });
      return NextResponse.json({
        status: 'success',
        data: {
          reserved: true,
          customerUid: issueResult.customerUid ?? customerUid,
          cancelSkipped: true,
        },
      });
    }

    return NextResponse.json({
      status: 'success',
      data: {
        reserved: true,
        customerUid: issueResult.customerUid ?? customerUid,
      },
    });
  } catch (error) {
    console.error('Fund billing reserve error:', error);
    return jsonError(500, 'SERVER_ERROR', 'server internal error.');
  }
}
