/**
 * 헥토파이낸셜 빌링키 결제 (Fund 상품)
 * - 빌링키 발급은 클라이언트(팝업/리다이렉트)에서 진행 후 billingKey 전달
 * - 주문 생성 후 서버에서 빌링키로 실제 결제(승인) 요청
 * - 개발 문서: https://develop.sbsvc.online
 */

export type HectoChargeResult =
  | { success: true; transactionId?: string; approvedAt?: string }
  | { success: false; code: string; message: string };

function getConfig() {
  const apiKey = process.env.HECTO_API_KEY ?? '';
  const apiSecret = process.env.HECTO_API_SECRET ?? '';
  const billingApiUrl = process.env.HECTO_BILLING_API_URL ?? '';
  return { apiKey, apiSecret, billingApiUrl };
}

/**
 * 빌링키로 결제(승인) 요청
 * - Fund 주문 생성 후 호출하여 실제 카드 청구
 */
export async function chargeWithBillingKey(options: {
  orderId: string;
  billingKey: string;
  amount: number;
  productName?: string;
  customerName?: string;
  customerMobile?: string;
}): Promise<HectoChargeResult> {
  const { apiKey, apiSecret, billingApiUrl } = getConfig();
  if (!apiKey || !apiSecret || !billingApiUrl) {
    console.warn('[payment/hecto] HECTO_API_KEY, HECTO_API_SECRET, HECTO_BILLING_API_URL 중 누락');
    return { success: false, code: 'CONFIG_MISSING', message: '헥토파이낸셜 결제 설정이 없습니다.' };
  }

  // TODO: 헥토파이낸셜 빌링키 결제 API 호출
  // - billingApiUrl + /v1/payments 또는 문서상 결제 요청 엔드포인트
  // - Body: billingKey, amount, orderId, merchantOrderId 등 (문서 기준)
  // - Header: Authorization (API Key/Secret)
  // - 성공 시 paymentStatus 업데이트용 transactionId 반환
  const _ = options;
  void _;

  return {
    success: false,
    code: 'NOT_IMPLEMENTED',
    message: '헥토파이낸셜 빌링키 결제 API 연동이 아직 구현되지 않았습니다. HECTO_BILLING_API_URL 및 API 스펙 확인 후 연동해 주세요.',
  };
}

export function isHectoConfigured(): boolean {
  const { apiKey, apiSecret, billingApiUrl } = getConfig();
  return Boolean(apiKey && apiSecret && billingApiUrl);
}
