import type { OnsitePaymentType, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { ORDER_PAYMENT_STATUS } from '@/lib/order-status';

/**
 * 전체 주문 조회(현장 운영) 공통 로직.
 * 응답 형식은 프론트 계약 `lib/services/orders-service.ts`(SalesOrder, OrdersResult)를 따른다.
 */

export const SALES_ORDERS_PAGE_SIZE = 30;
export const SALES_ORDERS_SEARCH_MAX_LENGTH = 50;

/** 판매자가 전체 주문 조회에서 환불한 주문의 cancelReason. 품절 자동 환불(STOCK_SHORTAGE)과 구분한다. */
export const CANCEL_REASON_SELLER_REFUND = 'SELLER_REFUND';

export type SalesOrderChannel = 'all' | 'online' | 'onsite';

/** onsite: 현장결제 수단 칸이 생기기 전의 현장결제 주문(수단 미기록). */
export type SalesOrderPaymentMethod = 'online' | 'card' | 'cash' | 'transfer' | 'onsite';

export type SalesOrderView = {
  id: string;
  orderNo: string;
  orderedAt: string;
  items: { productName: string; optionName: string | null; quantity: number }[];
  paymentMethod: SalesOrderPaymentMethod;
  paymentAmount: number;
  /** pending: 환불 요청은 됐지만 마무리 전(PortOne 응답을 못 받았거나 마무리 중 실패). 웹훅·재요청이 마무리한다. */
  refundStatus: 'none' | 'pending' | 'refunded';
};

export type SalesOrdersQuery = {
  date: string;
  timeKey: string;
  channel: SalesOrderChannel;
  search: string;
  page: number;
};

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** KST 기준 YYYY-MM-DD. */
export function kstDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function isCalendarDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** 쿼리 파싱. date 기본값은 오늘(KST), channel 기본값은 all, page 는 1부터. */
export function parseSalesOrdersQuery(
  params: URLSearchParams,
  now: Date = new Date(),
): { ok: true; value: SalesOrdersQuery } | { ok: false } {
  const date = params.get('date')?.trim() || kstDateString(now);
  if (!isCalendarDate(date)) return { ok: false };

  const channel = (params.get('channel')?.trim() || 'all') as SalesOrderChannel;
  if (!['all', 'online', 'onsite'].includes(channel)) return { ok: false };

  const pageText = params.get('page')?.trim() || '1';
  if (!/^\d+$/.test(pageText) || Number(pageText) < 1) return { ok: false };

  const search = (params.get('q') ?? '').trim();
  if (search.length > SALES_ORDERS_SEARCH_MAX_LENGTH) return { ok: false };

  return {
    ok: true,
    // OrderNumber.orderTimeKey 와 같은 형식(KST YYMMDD)
    value: { date, timeKey: date.slice(2).replace(/-/g, ''), channel, search, page: Number(pageText) },
  };
}

/**
 * 목록에 나오는 주문: 결제완료, 그리고 판매자가 환불한 주문. 결제 전·실패·품절 자동 환불 주문은 빠진다(#40 답에 따라 바뀔 수 있음).
 * 날짜는 주문번호 일자(OrderNumber.orderTimeKey) 기준이며, QR샵은 결제 확정 때 결제 시각으로 정해진다(#44).
 */
export function salesOrdersWhere(storeId: string, timeKey: string, channel: SalesOrderChannel): Prisma.OrderWhereInput {
  return {
    orderNumber: { storeId, orderTimeKey: timeKey },
    ...(channel === 'online' ? { paymentMethod: 'ONLINE' } : {}),
    ...(channel === 'onsite' ? { paymentMethod: 'ON_SITE' } : {}),
    OR: [
      { paymentStatus: ORDER_PAYMENT_STATUS.PAID },
      { paymentStatus: ORDER_PAYMENT_STATUS.CANCELED, cancelReason: CANCEL_REASON_SELLER_REFUND },
    ],
  };
}

export const SALES_ORDER_SELECT = {
  id: true,
  orderDate: true,
  paymentAmount: true,
  paymentMethod: true,
  onsitePaymentType: true,
  paymentStatus: true,
  cancelReason: true,
  refundRequestedAt: true,
  paidAt: true,
  orderNumber: { select: { orderNo: true } },
  items: {
    select: { onsiteProductName: true, onsiteOptionName: true, quantity: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.OrderSelect;

export type SalesOrderRow = {
  id: string;
  orderDate: Date;
  paymentAmount: number;
  paymentMethod: PaymentMethod;
  onsitePaymentType: OnsitePaymentType | null;
  paymentStatus: PaymentStatus;
  cancelReason: string | null;
  refundRequestedAt: Date | null;
  paidAt: Date | null;
  orderNumber: { orderNo: number | null } | null;
  items: { onsiteProductName: string | null; onsiteOptionName: string | null; quantity: number }[];
};

const ONSITE_METHOD: Record<OnsitePaymentType, SalesOrderPaymentMethod> = {
  CARD: 'card',
  CASH: 'cash',
  TRANSFER: 'transfer',
};

export function formatOrderNo(orderNo: number): string {
  return String(orderNo).padStart(3, '0');
}

export function toSalesOrderView(row: SalesOrderRow): SalesOrderView {
  const refunded =
    row.paymentStatus === ORDER_PAYMENT_STATUS.CANCELED && row.cancelReason === CANCEL_REASON_SELLER_REFUND;
  const refundPending = row.paymentStatus === ORDER_PAYMENT_STATUS.PAID && row.refundRequestedAt !== null;
  return {
    id: row.id,
    orderNo: row.orderNumber?.orderNo != null ? formatOrderNo(row.orderNumber.orderNo) : '',
    // 주문시각 = 결제 시각(주문번호 일자와 같은 기준). 결제 시각 칸이 생기기 전 주문은 주문 생성 시각.
    orderedAt: (row.paidAt ?? row.orderDate).toISOString(),
    items: row.items.map((item) => ({
      productName: item.onsiteProductName ?? '',
      optionName: item.onsiteOptionName,
      quantity: item.quantity,
    })),
    paymentMethod:
      row.paymentMethod === 'ONLINE'
        ? 'online'
        : row.onsitePaymentType
          ? ONSITE_METHOD[row.onsitePaymentType]
          : 'onsite',
    paymentAmount: row.paymentAmount,
    refundStatus: refunded ? 'refunded' : refundPending ? 'pending' : 'none',
  };
}

/** 검색: 3자리 주문번호 또는 상품명에 검색어가 들어 있으면 맞다(영문 대소문자 무시). */
export function matchesSalesOrderSearch(order: SalesOrderView, search: string): boolean {
  if (!search) return true;
  const needle = search.toLowerCase();
  if (order.orderNo.includes(needle)) return true;
  return order.items.some((item) => item.productName.toLowerCase().includes(needle));
}
