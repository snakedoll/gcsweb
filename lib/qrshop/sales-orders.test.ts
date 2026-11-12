// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { getOrderTimeKey } from './order-number';
import {
  CANCEL_REASON_SELLER_REFUND,
  matchesSalesOrderSearch,
  parseSalesOrdersQuery,
  salesOrdersWhere,
  toSalesOrderView,
  type SalesOrderRow,
} from './sales-orders';

const parse = (qs: string, now = new Date('2026-11-12T03:00:00Z')) =>
  parseSalesOrdersQuery(new URLSearchParams(qs), now);

const row = (over: Partial<SalesOrderRow> = {}): SalesOrderRow => ({
  id: 'o1',
  orderDate: new Date('2026-10-18T11:52:00Z'),
  paymentAmount: 3000,
  paymentMethod: 'ONLINE',
  onsitePaymentType: null,
  paymentStatus: 'PAID',
  cancelReason: null,
  refundRequestedAt: null,
  orderNumber: { orderNo: 3 },
  items: [
    { onsiteProductName: '반다나', onsiteOptionName: '홍색', quantity: 1 },
    { onsiteProductName: 'Keyring', onsiteOptionName: null, quantity: 2 },
  ],
  ...over,
});

describe('parseSalesOrdersQuery', () => {
  it('기본값: 오늘(KST), 전체, 1페이지, 검색어 없음', () => {
    // 2026-11-12T03:00Z = KST 12:00
    expect(parse('')).toEqual({
      ok: true,
      value: { date: '2026-11-12', timeKey: '261112', channel: 'all', search: '', page: 1 },
    });
  });

  it('UTC로는 전날이어도 KST 날짜를 쓴다', () => {
    const r = parse('', new Date('2026-11-11T16:30:00Z')); // KST 11-12 01:30
    expect(r.ok && r.value.date).toBe('2026-11-12');
  });

  it('timeKey 는 주문번호 발급 키(getOrderTimeKey)와 같은 형식이다', () => {
    const r = parse('date=2026-10-18');
    expect(r.ok && r.value.timeKey).toBe(getOrderTimeKey(new Date('2026-10-18T05:00:00Z')));
  });

  it.each(['date=2026-13-01', 'date=2026-02-30', 'date=20261018', 'channel=card', 'page=0', 'page=abc', `q=${'가'.repeat(51)}`])(
    '잘못된 조건은 거부: %s',
    (qs) => {
      expect(parse(qs).ok).toBe(false);
    },
  );

  it('검색어 앞뒤 공백은 지운다', () => {
    const r = parse('q=%20반다나%20&channel=online&page=2');
    expect(r.ok && r.value).toMatchObject({ search: '반다나', channel: 'online', page: 2 });
  });
});

describe('salesOrdersWhere', () => {
  it('결제완료와 판매자 환불 주문만, 상점·날짜로 거른다', () => {
    expect(salesOrdersWhere('s1', '261018', 'all')).toEqual({
      orderNumber: { storeId: 's1', orderTimeKey: '261018' },
      OR: [{ paymentStatus: 'PAID' }, { paymentStatus: 'CANCELED', cancelReason: CANCEL_REASON_SELLER_REFUND }],
    });
  });

  it('결제 구분으로 결제방법을 거른다', () => {
    expect(salesOrdersWhere('s1', 'k', 'online')).toMatchObject({ paymentMethod: 'ONLINE' });
    expect(salesOrdersWhere('s1', 'k', 'onsite')).toMatchObject({ paymentMethod: 'ON_SITE' });
  });
});

describe('toSalesOrderView', () => {
  it('프론트 계약(SalesOrder) 형식으로 바꾼다', () => {
    expect(toSalesOrderView(row())).toEqual({
      id: 'o1',
      orderNo: '003',
      orderedAt: '2026-10-18T11:52:00.000Z',
      items: [
        { productName: '반다나', optionName: '홍색', quantity: 1 },
        { productName: 'Keyring', optionName: null, quantity: 2 },
      ],
      paymentMethod: 'online',
      paymentAmount: 3000,
      refundStatus: 'none',
    });
  });

  it.each([
    ['CARD', 'card'],
    ['CASH', 'cash'],
    ['TRANSFER', 'transfer'],
    [null, 'onsite'],
  ] as const)('현장결제 수단 %s → %s', (type, expected) => {
    expect(toSalesOrderView(row({ paymentMethod: 'ON_SITE', onsitePaymentType: type })).paymentMethod).toBe(expected);
  });

  it('판매자 환불만 refunded 로 본다', () => {
    expect(toSalesOrderView(row({ paymentStatus: 'CANCELED', cancelReason: CANCEL_REASON_SELLER_REFUND })).refundStatus).toBe('refunded');
    expect(toSalesOrderView(row({ paymentStatus: 'CANCELED', cancelReason: 'STOCK_SHORTAGE' })).refundStatus).toBe('none');
  });

  it('결제완료인데 환불 의도가 남아 있으면 pending(환불 처리 중)', () => {
    expect(toSalesOrderView(row({ refundRequestedAt: new Date('2026-11-12T05:00:00Z') })).refundStatus).toBe('pending');
    expect(
      toSalesOrderView(
        row({ paymentStatus: 'CANCELED', cancelReason: CANCEL_REASON_SELLER_REFUND, refundRequestedAt: new Date() }),
      ).refundStatus,
    ).toBe('refunded');
  });

  it('주문번호는 3자리, 1000번부터는 그대로', () => {
    expect(toSalesOrderView(row({ orderNumber: { orderNo: 1 } })).orderNo).toBe('001');
    expect(toSalesOrderView(row({ orderNumber: { orderNo: 1024 } })).orderNo).toBe('1024');
  });
});

describe('matchesSalesOrderSearch', () => {
  const view = toSalesOrderView(row());

  it.each(['', '003', '03', '3', '반다', 'keyRING'])('맞음: "%s"', (q) => {
    expect(matchesSalesOrderSearch(view, q)).toBe(true);
  });

  it.each(['004', '홍색', '티셔츠'])('안 맞음: "%s" (옵션명은 검색 대상이 아니다)', (q) => {
    expect(matchesSalesOrderSearch(view, q)).toBe(false);
  });
});
