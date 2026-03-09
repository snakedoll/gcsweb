/**
 * KG이니시스 모바일 웹 결제 (Buy Now 상품)
 * - 모바일 게이트웨이로 form POST → 사용자 결제 → P_NEXT_URL 리다이렉트
 * - 이니시스 인코딩이 EUC-KR이므로 상품명·구매자명 등 한글 필드는 EUC-KR로 변환 후 전송
 * - 매뉴얼: https://manual.inicis.com
 */

import iconv from 'iconv-lite';

export type InicisMobileParams = {
  P_INI_PAYMENT: string;
  P_MID: string;
  P_OID: string;
  P_AMT: string;
  P_GOODS: string;
  P_UNAME: string;
  P_MOBILE: string;
  P_EMAIL: string;
  P_NEXT_URL: string;
  P_NOTI_URL: string;
  P_CHARSET: string;
  P_RESERVED?: string;
};

function getConfig() {
  const mid = process.env.KG_INICIS_MID ?? '';
  const signKey = process.env.KG_INICIS_SIGNKEY ?? '';
  const returnUrl = process.env.KG_INICIS_RETURN_URL ?? '';
  const gatewayUrl = process.env.KG_INICIS_GATEWAY_URL ?? '';
  return { mid, signKey, returnUrl, gatewayUrl };
}

export function getInicisGatewayUrl(): string {
  return process.env.KG_INICIS_GATEWAY_URL ?? '';
}

/**
 * UTF-8 문자열을 EUC-KR bytes로 변환 후, form value에 쓸 수 있는 바이너리 문자열로 반환.
 * (문자 코드 0~255 = 1바이트. form submit 시 ISO-8859-1로 인코딩하면 그대로 전송됨)
 */
function toEucKrBinary(str: string): string {
  const buf = iconv.encode(str, 'euc-kr');
  return Array.from(buf)
    .map((b) => String.fromCharCode(b))
    .join('');
}

/**
 * paymentMethod + easyPayProvider → P_INI_PAYMENT, P_RESERVED 결정.
 * - 간편결제는 P_INI_PAYMENT=CARD, 다이렉트 호출은 P_RESERVED로 지정.
 */
export function resolveIniPayment(
  paymentMethod: number,
  easyPayProvider: number | null,
): { pIniPayment: string; pReserved?: string } {
  switch (paymentMethod) {
    case 0:
      return { pIniPayment: 'CARD' };
    case 1:
      return { pIniPayment: 'VBANK' };
    case 2: {
      const reservedMap: Record<number, string> = {
        0: 'd_kakaopay=Y',
        1: 'd_npay=Y',
        2: 'd_tosspay=Y',
      };
      const pReserved = easyPayProvider != null ? reservedMap[easyPayProvider] : undefined;
      return { pIniPayment: 'CARD', pReserved };
    }
    default:
      return { pIniPayment: 'CARD' };
  }
}

/**
 * 모바일 결제 파라미터 생성.
 * 클라이언트에서 gatewayUrl로 form POST한다.
 */
export function buildInicisMobileParams(options: {
  orderId: string;
  amount: number;
  goodname: string;
  buyername: string;
  buyertel: string;
  buyeremail?: string;
  pIniPayment?: string;
  pReserved?: string;
}): InicisMobileParams | null {
  const { mid, returnUrl } = getConfig();
  if (!mid || !returnUrl) {
    console.warn('[payment/inicis] KG_INICIS_MID, KG_INICIS_RETURN_URL 중 누락');
    return null;
  }

  const goodname = options.goodname.slice(0, 80);
  const buyername = options.buyername.trim().slice(0, 20);

  const params: InicisMobileParams = {
    P_INI_PAYMENT: options.pIniPayment ?? 'CARD',
    P_MID: mid,
    P_OID: options.orderId,
    P_AMT: String(options.amount),
    P_GOODS: toEucKrBinary(goodname),
    P_UNAME: toEucKrBinary(buyername),
    P_MOBILE: options.buyertel.trim().replace(/\D/g, ''),
    P_EMAIL: (options.buyeremail ?? '').trim(),
    P_NEXT_URL: returnUrl,
    P_NOTI_URL: returnUrl,
    P_CHARSET: 'euc-kr',
  };

  if (options.pReserved) {
    params.P_RESERVED = options.pReserved;
  }

  return params;
}

export function isInicisConfigured(): boolean {
  const { mid, returnUrl, gatewayUrl } = getConfig();
  return Boolean(mid && returnUrl && gatewayUrl);
}
