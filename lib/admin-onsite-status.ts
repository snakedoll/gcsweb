export const ONSITE_PAYMENT_METHOD = {
  CARD: 0,
  BANK_TRANSFER: 1,
  EASY_PAY: 2,
  COUNTER: 3,
} as const;

export const ONSITE_PAYMENT_STATUS = {
  CREATED: 0,
  UNPAID: 1,
  PAID: 2,
  CANCELED: 3,
  FAILED: 4,
} as const;

export const ONSITE_FULFILLMENT_STATUS = {
  NOT_RECEIVED: 0,
  RECEIVED: 1,
} as const;

/** 온라인 결제는 verify 전까지 CREATED(0). 창 오픈~실패 복귀까지 걸린 뒤에도 미검증이면 실패·이탈로 본다. */
const ADMIN_ONSITE_ONLINE_UNPAID_STALE_MS = 90 * 1000;

export function isCounterPaymentMethod(paymentMethod: number) {
  return paymentMethod === ONSITE_PAYMENT_METHOD.COUNTER;
}

export function toOnsitePaymentStatusLabel(params: {
  paymentMethod: number;
  paymentStatus: number;
  fulfillmentStatus: number | null;
  /** 있으면 온라인 CREATED(0) 주문을 결제대기/결제 취소로 나눈다. */
  orderDate?: Date;
}) {
  const { paymentMethod, paymentStatus, fulfillmentStatus, orderDate } = params;

  if (paymentStatus === ONSITE_PAYMENT_STATUS.CANCELED) return '주문취소';
  if (paymentStatus === ONSITE_PAYMENT_STATUS.FAILED) return '결제 취소';

  if (isCounterPaymentMethod(paymentMethod)) {
    if (fulfillmentStatus === ONSITE_FULFILLMENT_STATUS.RECEIVED) return '결제완료';
    return '미결제';
  }

  if (paymentStatus === ONSITE_PAYMENT_STATUS.CREATED) {
    if (!orderDate || Number.isNaN(orderDate.getTime())) return '결제 취소';
    const ageMs = Date.now() - orderDate.getTime();
    if (ageMs > ADMIN_ONSITE_ONLINE_UNPAID_STALE_MS) return '결제 취소';
    return '결제대기';
  }

  return '결제완료';
}

export function toOnsiteReceiptStatusLabel(fulfillmentStatus: number | null) {
  return fulfillmentStatus === ONSITE_FULFILLMENT_STATUS.RECEIVED ? '수령완료' : '미수령';
}

