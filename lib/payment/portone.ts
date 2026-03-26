/**
 * 포트원 V2 API (Buy Now / Fund 통합)
 * - Buy Now: 결제창 SDK → 결제 조회 API로 검증
 * - Fund: 빌링키 결제 API
 * - 참고: https://developers.portone.io
 */

const API_BASE = 'https://api.portone.io';
const API_V1_BASE = 'https://api.iamport.kr';

function getSecret(): string {
  return process.env.PORTONE_API_SECRET ?? '';
}

function getConfig() {
  const authAmountRaw = process.env.PORTONE_BILLING_AUTH_AMOUNT?.trim();
  const authAmount = authAmountRaw ? Math.max(1, Math.min(10000, Number(authAmountRaw) || 1)) : 1;
  return {
    storeId: process.env.PORTONE_STORE_ID ?? '',
    channelKey: process.env.PORTONE_CHANNEL_KEY ?? '',
    billingChannelKey: process.env.PORTONE_BILLING_CHANNEL_KEY ?? '',
    billingPg: process.env.PORTONE_BILLING_PG ?? '',
    apiSecret: getSecret(),
    v1ApiKey: process.env.PORTONE_V1_API_KEY ?? '',
    v1ApiSecret: process.env.PORTONE_V1_API_SECRET ?? '',
    /** 빌링키 발급 시 1원 승인 금액. PG/카드사 최소금액 제한 시 100 등으로 설정 (즉시 취소됨) */
    billingAuthAmount: authAmount,
  };
}

/** Fund 빌링키 발급 시 사용한 승인 금액(취소 시 동일 금액 필요) */
export function getBillingAuthAmount(): number {
  return getConfig().billingAuthAmount;
}

async function getV1AccessToken(): Promise<{ success: true; accessToken: string } | { success: false; code: string; message: string }> {
  const { v1ApiKey, v1ApiSecret } = getConfig();
  if (!v1ApiKey || !v1ApiSecret) {
    return { success: false, code: 'CONFIG_MISSING', message: 'PORTONE_V1_API_KEY/SECRET 미설정' };
  }

  const tokenRes = await fetch(`${API_V1_BASE}/users/getToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imp_key: v1ApiKey,
      imp_secret: v1ApiSecret,
    }),
  });
  const tokenJson = await tokenRes.json().catch(() => ({}));
  const accessToken = tokenJson?.response?.access_token as string | undefined;
  if (!tokenRes.ok || !accessToken) {
    return {
      success: false,
      code: tokenJson?.code ? String(tokenJson.code) : 'V1_TOKEN_ERROR',
      message: tokenJson?.message ?? 'V1 access token 발급 실패',
    };
  }

  return { success: true, accessToken };
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
 * paymentId(주문ID)로 조회. PortOne API: GET /payments/{paymentId}
 */
export async function getPayment(merchantUid: string): Promise<{
  success: boolean;
  status?: string;
  amount?: { total: number };
  impUid?: string; // 포트원/PG 고유 거래번호
  code?: string;
  message?: string;
}> {
  const secret = getSecret();
  if (!secret) {
    return { success: false, code: 'CONFIG_MISSING', message: 'PORTONE_API_SECRET 미설정' };
  }

  const res = await fetch(`${API_BASE}/payments/${encodeURIComponent(merchantUid)}`, {
    headers: { Authorization: `PortOne ${secret}` },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[PortOne][getPayment] HTTP error', {
      paymentId: merchantUid,
      status: res.status,
      code: data?.code ?? null,
      message: data?.message ?? null,
    });
    return {
      success: false,
      code: data?.code ?? 'API_ERROR',
      message: data?.message ?? '결제 조회 실패',
    };
  }

  if (data?.code != null && data.code !== 0) {
    console.error('[PortOne][getPayment] API error payload', {
      paymentId: merchantUid,
      code: data?.code ?? null,
      message: data?.message ?? null,
    });
    return {
      success: false,
      code: String(data.code),
      message: data?.message ?? '결제 조회 실패',
    };
  }

  const payload = data?.response ?? data;
  if (!payload) {
    console.error('[PortOne][getPayment] Empty payload', {
      paymentId: merchantUid,
    });
    return { success: false, code: 'NOT_FOUND', message: '결제 정보를 찾을 수 없습니다.' };
  }

  const impUid = payload.pgTid || payload.transactionId || payload.imp_uid;

  return {
    success: true,
    status: payload.status,
    amount: total != null ? { total } : undefined,
    impUid: typeof impUid === 'string' ? impUid : undefined,
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
  impUid?: string;
  code?: string;
  message?: string;
}> {
  const { v1ApiKey, v1ApiSecret } = getConfig();
  if (v1ApiKey && v1ApiSecret) {
    const tokenResult = await getV1AccessToken();
    if (!tokenResult.success) {
      return tokenResult;
    }

    const payRes = await fetch(`${API_V1_BASE}/subscribe/payments/again`, {
      method: 'POST',
      headers: {
        Authorization: tokenResult.accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_uid: params.billingKey,
        merchant_uid: params.paymentId,
        amount: params.totalAmount,
        name: params.orderName,
        buyer_name: params.customerName,
        buyer_tel: params.customerMobile?.replace(/\D/g, ''),
      }),
    });
    const payJson = await payRes.json().catch(() => ({}));
    const payCode = payJson?.code;
    const payStatus = payJson?.response?.status as string | undefined;
    const paid = payCode === 0 && payStatus === 'paid';
    const impUid = payJson?.response?.imp_uid;
    return {
      success: paid,
      status: payStatus,
      impUid: typeof impUid === 'string' ? impUid : undefined,
      code: paid ? undefined : (payCode != null ? String(payCode) : 'V1_PAYMENT_ERROR'),
      message: paid ? undefined : (payJson?.message ?? 'V1 빌링 결제 실패'),
    };
  }

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

  const impUid = data.pgTid || data.transactionId || data.imp_uid;

  return {
    success: paid,
    status,
    impUid: typeof impUid === 'string' ? impUid : undefined,
    code: paid ? undefined : data?.code,
    message: paid ? undefined : data?.message ?? '결제 미완료',
  };
}

export async function issueBillingKeyWithOnetime(params: {
  customerUid: string;
  merchantUid: string;
  cardNumber: string;
  expiry: string;
  birth: string;
  pwd2digit: string;
  buyerName?: string;
  buyerTel?: string;
  buyerEmail?: string;
}): Promise<{
  success: boolean;
  impUid?: string;
  customerUid?: string;
  code?: string;
  message?: string;
}> {
  const { billingPg } = getConfig();
  if (!billingPg) {
    return { success: false, code: 'CONFIG_MISSING', message: 'PORTONE_BILLING_PG 미설정' };
  }

  const tokenResult = await getV1AccessToken();
  if (!tokenResult.success) {
    return tokenResult;
  }

  // 아임포트 V1 API는 expiry를 YYYY-MM 형식으로 요구함. MMYY(4자리)는 변환.
  const rawExpiry = params.expiry.replace(/\D/g, '');
  const expiryForV1 =
    rawExpiry.length === 4
      ? `20${rawExpiry.slice(2)}-${rawExpiry.slice(0, 2)}`
      : params.expiry;

  const authAmount = getConfig().billingAuthAmount;
  const onetimeRes = await fetch(`${API_V1_BASE}/subscribe/payments/onetime`, {
    method: 'POST',
    headers: {
      Authorization: tokenResult.accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pg: billingPg,
      customer_uid: params.customerUid,
      merchant_uid: params.merchantUid,
      amount: authAmount,
      card_number: params.cardNumber.replace(/\D/g, ''),
      expiry: expiryForV1,
      birth: params.birth,
      pwd_2digit: params.pwd2digit,
      buyer_name: params.buyerName,
      buyer_tel: params.buyerTel?.replace(/\D/g, ''),
      buyer_email: params.buyerEmail,
      name: 'Fund 예약 결제 등록',
    }),
  });
  const onetimeJson = await onetimeRes.json().catch(() => ({}));
  const code = onetimeJson?.code;
  const response = onetimeJson?.response ?? {};
  const paid = code === 0 && response?.status === 'paid';
  const impUid = typeof response?.imp_uid === 'string' ? response.imp_uid : undefined;
  const customerUid = typeof response?.customer_uid === 'string' ? response.customer_uid : params.customerUid;
  if (!onetimeRes.ok || !paid || !impUid) {
    console.error('[PortOne][issueBillingKeyWithOnetime] failure', {
      httpStatus: onetimeRes.status,
      code: code != null ? String(code) : null,
      message: onetimeJson?.message ?? null,
      expirySent: expiryForV1,
      hasBirth: Boolean(params.birth),
      pg: billingPg,
    });
    return {
      success: false,
      code: code != null ? String(code) : 'V1_ONETIME_ERROR',
      message: onetimeJson?.message ?? 'V1 onetime 빌링키 발급 실패',
    };
  }

  return {
    success: true,
    impUid,
    customerUid,
  };
}

export async function cancelV1Payment(params: {
  impUid: string;
  amount: number;
  reason?: string;
  /** onetime 결제 취소 시 동일 거래 조회를 위해 merchant_uid 함께 전달 권장 */
  merchantUid?: string;
}): Promise<{
  success: boolean;
  code?: string;
  message?: string;
}> {
  const tokenResult = await getV1AccessToken();
  if (!tokenResult.success) {
    return tokenResult;
  }

  const body: Record<string, unknown> = {
    imp_uid: params.impUid,
    amount: params.amount,
    reason: params.reason ?? 'Fund 예약 결제 등록 즉시취소',
    checksum: params.amount,
  };
  if (params.merchantUid) {
    body.merchant_uid = params.merchantUid;
  }

  const cancelRes = await fetch(`${API_V1_BASE}/payments/cancel`, {
    method: 'POST',
    headers: {
      Authorization: tokenResult.accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const cancelJson = await cancelRes.json().catch(() => ({}));
  const code = cancelJson?.code;
  if (!cancelRes.ok || code !== 0) {
    return {
      success: false,
      code: code != null ? String(code) : 'V1_CANCEL_ERROR',
      message: cancelJson?.message ?? 'V1 결제 취소 실패',
    };
  }

  return { success: true };
}
