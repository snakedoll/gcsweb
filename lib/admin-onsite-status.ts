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

export function isCounterPaymentMethod(paymentMethod: number) {
  return paymentMethod === ONSITE_PAYMENT_METHOD.COUNTER;
}

export function toOnsitePaymentStatusLabel(params: {
  paymentMethod: number;
  paymentStatus: number;
  fulfillmentStatus: number | null;
}) {
  const { paymentMethod, paymentStatus, fulfillmentStatus } = params;

  if (paymentStatus === ONSITE_PAYMENT_STATUS.CANCELED) return '주문취소';
  if (paymentStatus === ONSITE_PAYMENT_STATUS.FAILED) return '결제실패';

  if (isCounterPaymentMethod(paymentMethod)) {
    if (fulfillmentStatus === ONSITE_FULFILLMENT_STATUS.RECEIVED) return '결제완료';
    return '미결제';
  }

  return '결제완료';
}

export function toOnsiteReceiptStatusLabel(fulfillmentStatus: number | null) {
  return fulfillmentStatus === ONSITE_FULFILLMENT_STATUS.RECEIVED ? '수령완료' : '미수령';
}

