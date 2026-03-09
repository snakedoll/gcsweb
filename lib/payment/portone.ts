/**
 * 포트원 V2 API (Buy Now / Fund 통합)
 * - Buy Now: 결제창 SDK → 결제 조회 API로 검증
 * - Fund: 빌링키 결제 API
 * - 참고: https://developers.portone.io
 */

const API_BASE = 'https://api.portone.io';

function getSecret(): string {
  return process.env.PORTONE_API_SECRET ?? '';
}

function getConfig() {
  return {
    storeId: process.env.PORTONE_STORE_ID ?? '',
    channelKey: process.env.PORTONE_CHANNEL_KEY ?? '',
    billingChannelKey: process.env.PORTONE_BILLING_CHANNEL_KEY ?? '',
    apiSecret: getSecret(),
  };
}

export function isPortoneConfigured(): boolean {
  const { storeId, channelKey, apiSecret } = getConfig();
  return Boolean(storeId && channelKey && apiSecret);
}

export function getPortonePaymentConfig() {
  const { storeId, channelKey } = getConfig();
  return { storeId, channelKey };
}

export function getPortoneBillingChannelKey(): string {
  return getConfig().billingChannelKey || getConfig().channelKey;
}

/**
 * 결제 단건 조회 (검증용)
 */
export async function getPayment(paymentId: string): Promise<{
  success: boolean;
  status?: string;
  amount?: { total: number };
  code?: string;
  message?: string;
}> {
  const secret = getSecret();
  if (!secret) {
    return { success: false, code: 'CONFIG_MISSING', message: 'PORTONE_API_SECRET 미설정' };
  }

  const res = await fetch(`${API_BASE}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `PortOne ${secret}` },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      success: false,
      code: data?.code ?? 'API_ERROR',
      message: data?.message ?? '결제 조회 실패',
    };
  }

  return {
    success: true,
    status: data?.status,
    amount: data?.amount,
  };
}

/**
 * 빌링키 결제
 */
export async function chargeWithBillingKey(params: {
  paymentId: string;
  billingKey: string;
  orderName: string;
  totalAmount: number;
  customerName?: string;
  customerMobile?: string;
}): Promise<{
  success: boolean;
  status?: string;
  code?: string;
  message?: string;
}> {
  const secret = getSecret();
  if (!secret) {
    return { success: false, code: 'CONFIG_MISSING', message: 'PORTONE_API_SECRET 미설정' };
  }

  const body = {
    billingKey: params.billingKey,
    orderName: params.orderName,
    amount: { total: params.totalAmount },
    currency: 'KRW',
    customer: {
      fullName: params.customerName,
      mobilePhoneNumber: params.customerMobile?.replace(/\D/g, ''),
    },
  };

  const res = await fetch(
    `${API_BASE}/payments/${encodeURIComponent(params.paymentId)}/billing-key`,
    {
      method: 'POST',
      headers: {
        Authorization: `PortOne ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      success: false,
      code: data?.code ?? data?.type ?? 'API_ERROR',
      message: data?.message ?? '빌링키 결제 실패',
    };
  }

  const status = data?.status;
  const paid = status === 'PAID' || status === 'VIRTUAL_ACCOUNT_ISSUED';

  return {
    success: paid,
    status,
    code: paid ? undefined : data?.code,
    message: paid ? undefined : data?.message ?? '결제 미완료',
  };
}
