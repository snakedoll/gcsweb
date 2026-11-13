// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/db';
import { reconcilePendingRefunds, refundSalesOrder } from '@/lib/qrshop/sales-order-refund';
import { getStoreAccess } from '@/lib/qrshop/store-access';
import { GET } from './route';
import { POST } from './[orderId]/refund/route';

vi.mock('@/lib/qrshop/store-access', () => ({ getStoreAccess: vi.fn() }));
vi.mock('@/lib/qrshop/sales-order-refund', () => ({ refundSalesOrder: vi.fn(), reconcilePendingRefunds: vi.fn() }));
vi.mock('@/lib/db', () => ({ prisma: { order: { findMany: vi.fn() } } }));

type Fn = ReturnType<typeof vi.fn>;
const access = getStoreAccess as unknown as Fn;
const refund = refundSalesOrder as unknown as Fn;
const reconcile = reconcilePendingRefunds as unknown as Fn;
const findMany = prisma.order.findMany as unknown as Fn;

const STORE = { storeId: 's1', name: '잇장샵', storeSlug: 'itjang', createdAt: new Date('2026-09-01T03:00:00Z') };

let seq = 0;
const row = (orderNo: number, over: Record<string, unknown> = {}) => ({
  id: `o${orderNo}`,
  orderDate: new Date(Date.UTC(2026, 9, 18, 0, 0, orderNo)),
  paymentAmount: 3000,
  paymentMethod: 'ONLINE',
  onsitePaymentType: null,
  paymentStatus: 'PAID',
  cancelReason: null,
  refundRequestedAt: null,
  paidAt: null,
  orderNumber: { orderNo },
  items: [{ onsiteProductName: orderNo % 2 ? '반다나' : '엽서', onsiteOptionName: null, quantity: 1 }],
  _seq: seq++,
  ...over,
});

const list = (qs = '') => GET(new Request(`http://localhost/api/v2/qrshop/sales-orders${qs}`));
const post = (body: unknown) =>
  POST(new Request('http://localhost/api', { method: 'POST', body: JSON.stringify(body) }), {
    params: { orderId: 'o1' },
  });

beforeEach(() => {
  vi.resetAllMocks();
  access.mockResolvedValue({ ok: true, userId: 'u1', access: { role: 'STAFF', store: STORE } });
  findMany.mockResolvedValue([]);
  reconcile.mockResolvedValue(0);
});

describe('GET /api/v2/qrshop/sales-orders', () => {
  it('로그인하지 않았으면 401', async () => {
    access.mockResolvedValue({ ok: false, reason: 'UNAUTHORIZED' });
    expect((await list()).status).toBe(401);
  });

  it('소유자도 승인된 직원도 아니면 404', async () => {
    access.mockResolvedValue({ ok: true, userId: 'u1', access: null });
    expect((await list()).status).toBe(404);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('잘못된 조회 조건은 400', async () => {
    expect((await list('?date=2026-02-30')).status).toBe(400);
    expect((await list('?channel=card')).status).toBe(400);
  });

  it('승인된 직원 상점의 해당 날짜 주문을 상점·날짜·결제 구분으로 조회한다', async () => {
    await list('?date=2026-10-18&channel=onsite');
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          orderNumber: { storeId: 's1', orderTimeKey: '261018' },
          paymentMethod: 'ON_SITE',
        }),
        orderBy: [{ orderNumber: { orderNo: 'desc' } }, { orderDate: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('목록을 읽기 전에 그 상점·그날의 처리 중 환불을 확인한다', async () => {
    await list('?date=2026-10-18');
    expect(reconcile).toHaveBeenCalledWith({ storeId: 's1', timeKey: '261018' });
    expect(reconcile.mock.invocationCallOrder[0]).toBeLessThan(findMany.mock.invocationCallOrder[0]);
  });

  it('처리 중 환불 확인이 실패해도 목록은 그대로 보여 준다', async () => {
    reconcile.mockRejectedValue(new Error('portone down'));
    findMany.mockResolvedValue([row(1)]);
    const res = await list('?date=2026-10-18');
    expect(res.status).toBe(200);
    expect((await res.json()).data.total).toBe(1);
  });

  it('권한이 없으면 처리 중 환불 확인도 하지 않는다', async () => {
    access.mockResolvedValue({ ok: true, userId: 'u1', access: null });
    await list();
    expect(reconcile).not.toHaveBeenCalled();
  });

  it('응답: 프론트 계약 형식 + 날짜 이동 범위(개설일·오늘)', async () => {
    findMany.mockResolvedValue([row(2), row(1)]);
    const body = await (await list('?date=2026-10-18')).json();
    expect(body.data).toMatchObject({ total: 2, page: 1, pageSize: 30, openedOn: '2026-09-01' });
    expect(body.data.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(body.data.orders[0]).toEqual({
      id: 'o2',
      orderNo: '002',
      orderedAt: expect.any(String),
      items: [{ productName: '엽서', optionName: null, quantity: 1 }],
      paymentMethod: 'online',
      paymentAmount: 3000,
      refundStatus: 'none',
    });
  });

  it('검색: 주문번호 또는 상품명, total 은 검색 후 건수', async () => {
    findMany.mockResolvedValue([row(12), row(11), row(3)]);
    const none = await (await list('?q=004')).json();
    expect(none.data).toMatchObject({ orders: [], total: 0 });
    const byNo = await (await list('?q=01')).json();
    expect(byNo.data.orders.map((o: { orderNo: string }) => o.orderNo)).toEqual(['012', '011']);
    const exact = await (await list('?q=003')).json();
    expect(exact.data.orders.map((o: { orderNo: string }) => o.orderNo)).toEqual(['003']);
    const byName = await (await list('?q=반다')).json();
    expect(byName.data).toMatchObject({ total: 2 });
    expect(byName.data.orders.map((o: { orderNo: string }) => o.orderNo)).toEqual(['011', '003']);
  });

  it('30건씩 페이지를 나눈다', async () => {
    findMany.mockResolvedValue(Array.from({ length: 65 }, (_, i) => row(65 - i)));
    const p1 = await (await list('?page=1')).json();
    const p3 = await (await list('?page=3')).json();
    expect(p1.data.orders).toHaveLength(30);
    expect(p1.data.orders[0].orderNo).toBe('065');
    expect(p3.data.orders.map((o: { orderNo: string }) => o.orderNo)).toEqual(['005', '004', '003', '002', '001']);
    expect(p3.data.total).toBe(65);
  });
});

describe('POST /api/v2/qrshop/sales-orders/{orderId}/refund', () => {
  it('로그인하지 않았으면 401, 상점 권한이 없으면 404', async () => {
    access.mockResolvedValue({ ok: false, reason: 'UNAUTHORIZED' });
    expect((await post({ restoreStock: true })).status).toBe(401);
    access.mockResolvedValue({ ok: true, userId: 'u1', access: null });
    expect((await post({ restoreStock: true })).status).toBe(404);
    expect(refund).not.toHaveBeenCalled();
  });

  it.each([{}, { restoreStock: 'yes' }, null])('restoreStock 이 boolean 이 아니면 400: %j', async (body) => {
    expect((await post(body)).status).toBe(400);
  });

  it('승인된 직원도 환불할 수 있고, 내 상점으로 한정해 호출한다', async () => {
    refund.mockResolvedValue({
      kind: 'REFUNDED',
      stockNotRestored: 0,
      order: row(1, { paymentStatus: 'CANCELED', cancelReason: 'SELLER_REFUND' }),
    });
    const res = await post({ restoreStock: true });
    expect(res.status).toBe(200);
    expect(refund).toHaveBeenCalledWith({ orderId: 'o1', storeId: 's1', restoreStock: true, userId: 'u1' });
    expect((await res.json()).data).toMatchObject({ id: 'o1', orderNo: '001', refundStatus: 'refunded', refundRestoreStock: true });
  });

  it.each([
    ['NOT_FOUND', 404, 'NOT_FOUND', '주문을 찾을 수 없음'],
    ['ALREADY_REFUNDED', 409, 'ORDER_ALREADY_REFUNDED', '이미 환불된 주문'],
    ['NOT_REFUNDABLE', 409, 'ORDER_NOT_REFUNDABLE', '환불할 수 없는 주문'],
    ['REFUND_PENDING', 409, 'REFUND_PENDING', '환불 처리 중'],
    ['CANCEL_FAILED', 500, 'SERVER_ERROR', '결제 취소 실패'],
  ])('%s → %i %s', async (kind, status, code, message) => {
    refund.mockResolvedValue({ kind });
    const res = await post({ restoreStock: false });
    expect(res.status).toBe(status);
    expect(await res.json()).toMatchObject({ code, message });
  });

  it('환불 처리 중 오류(예: 현장 결제 마무리 실패)는 500', async () => {
    refund.mockRejectedValue(new Error('db down'));
    expect((await post({ restoreStock: true })).status).toBe(500);
  });
});
