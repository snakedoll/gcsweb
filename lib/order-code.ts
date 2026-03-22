const ORDER_CODE_TIME_ZONE = 'Asia/Seoul';
const ORDER_CODE_ALPHABET = 'ABCDEFGHKMNPQRSTWXYZ';
const ORDER_SEQUENCE_WIDTH = 3;
const ORDER_SEQUENCE_MAX = 999;

export type OrderProductTypeCode = 'F' | 'B';

export function getOrderDateKeyYYMMDD(date: Date = new Date()): string {
  if (Number.isNaN(date.getTime())) {
    throw new Error('invalid date');
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ORDER_CODE_TIME_ZONE,
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error('failed to format order date key');
  }

  return `${year}${month}${day}`;
}

export function mapProductTypeToOrderCode(productType: number): OrderProductTypeCode {
  if (productType === 0) return 'F';
  if (productType === 1) return 'B';
  throw new Error('unsupported productType for order code');
}

export function formatOrderSequence(orderSeq: number): string {
  if (!Number.isInteger(orderSeq) || orderSeq < 1 || orderSeq > ORDER_SEQUENCE_MAX) {
    throw new Error('order sequence must be an integer between 1 and 999');
  }
  return String(orderSeq).padStart(ORDER_SEQUENCE_WIDTH, '0');
}

// 주문 코드 앞 10자리(YYMMDD + ProductType + Sequence) 기반으로 검증문자 1자리 생성
export function calculateOrderCheckCharacter(base: string): string {
  if (!/^\d{6}[FB]\d{3}$/.test(base)) {
    throw new Error('invalid order code base format');
  }

  let acc = 0;
  for (const ch of base) {
    acc = (acc * 31 + ch.charCodeAt(0)) % ORDER_CODE_ALPHABET.length;
  }
  return ORDER_CODE_ALPHABET[acc];
}

export function buildOrderCode(params: {
  orderDateKey: string;
  productTypeCode: OrderProductTypeCode;
  orderSeq: number;
}): string {
  const { orderDateKey, productTypeCode, orderSeq } = params;
  if (!/^\d{6}$/.test(orderDateKey)) {
    throw new Error('orderDateKey must be YYMMDD');
  }

  const seq = formatOrderSequence(orderSeq);
  const base = `${orderDateKey}${productTypeCode}${seq}`;
  const checkCharacter = calculateOrderCheckCharacter(base);
  return `${base}${checkCharacter}`;
}

export function isValidOrderCode(orderCode: string): boolean {
  if (!/^\d{6}[FB]\d{3}[A-Z]$/.test(orderCode)) {
    return false;
  }

  const base = orderCode.slice(0, 10);
  const checkCharacter = orderCode.slice(10);
  if (!ORDER_CODE_ALPHABET.includes(checkCharacter)) {
    return false;
  }

  return calculateOrderCheckCharacter(base) === checkCharacter;
}

export const ORDER_CODE_CONFIG = {
  timeZone: ORDER_CODE_TIME_ZONE,
  alphabet: ORDER_CODE_ALPHABET,
  sequenceWidth: ORDER_SEQUENCE_WIDTH,
  sequenceMax: ORDER_SEQUENCE_MAX,
} as const;

