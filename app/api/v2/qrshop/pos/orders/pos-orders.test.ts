// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { completePosSale } from '@/lib/qrshop/pos-sale';
import { getStoreAccess } from '@/lib/qrshop/store-access';
import { POST } from './route';

vi.mock('@/lib/qrshop/store-access', () => ({ getStoreAccess: vi.fn() }));
vi.mock('@/lib/qrshop/pos-sale', () => ({ completePosSale: vi.fn() }));
vi.mock('@/lib/db', () => ({ prisma: {} }));

type Fn = ReturnType<typeof vi.fn>;
const access = getStoreAccess as unknown as Fn;
const sale = completePosSale as unknown as Fn;

const STORE = { storeId: 's1', name: '잇장샵', storeSlug: 'itjang', createdAt: new Date('2026-09-01T00:00:00Z') };
const BODY = { items: [{ productId: 'p1', quantity: 2 }], paymentMethod: 'cash' };
const post = (body: unknown) =>
  POST(new Request('http://localhost/api/v2/qrshop/pos/orders', { method: 'POST', body: JSON.stringify(body) }));

beforeEach(() => {
  vi.resetAllMocks();
  access.mockResolvedValue({ ok: true, userId: 'u1', access: { role: 'STAFF', store: STORE } });
});

describe('POST /api/v2/qrshop/pos/orders', () => {
  it('로그인하지 않았으면 401, 소유자·승인된 직원이 아니면 404', async () => {
    access.mockResolvedValue({ ok: false, reason: 'UNAUTHORIZED' });
    expect((await post(BODY)).status).toBe(401);
    access.mockResolvedValue({ ok: true, userId: 'u1', access: null });
    expect((await post(BODY)).status).toBe(404);
    expect(sale).not.toHaveBeenCalled();
  });

  it.each([
    [{ items: [], paymentMethod: 'cash' }],
    [{ items: [{ productId: 'p1', quantity: 0 }], paymentMethod: 'cash' }],
    [{ items: [{ productId: 'p1', quantity: 1.5 }], paymentMethod: 'cash' }],
    [{ items: [{ productId: 'p1', quantity: 1 }], paymentMethod: 'online' }],
    [{ items: [{ productId: 'p1', quantity: 1 }] }],
    [null],
  ])('요청 형식이 틀리면 400: %j', async (body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect((await res.json()).message).toBe('유효하지 않은 요청');
  });

  it('승인된 직원도 결제할 수 있고, 내 상점으로 한정해 호출한다', async () => {
    const receipt = { orderId: 'ord1', orderCode: '006', lines: [], totalAmount: 2000, paymentMethod: 'cash' };
    sale.mockResolvedValue({ kind: 'COMPLETED', receipt });
    const res = await post(BODY);
    expect(res.status).toBe(200);
    expect(sale).toHaveBeenCalledWith({ storeSlug: 'itjang', items: BODY.items, paymentMethod: 'cash' });
    expect((await res.json()).data).toEqual(receipt);
  });

  it('재고가 모자라면 409 SOLD_OUT 과 품절 항목 목록', async () => {
    const soldOutItems = [{ productId: 'p1', optionId: null, name: '엽서', optionName: null, availableQuantity: 1 }];
    sale.mockResolvedValue({ kind: 'SOLD_OUT', soldOutItems });
    const res = await post(BODY);
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: 'SOLD_OUT', message: '품절된 상품', data: { soldOutItems } });
  });

  it.each([
    ['PRODUCT_NOT_FOUND', 404, '존재하지 않는 상품'],
    ['OPTION_NOT_FOUND', 404, '존재하지 않는 옵션'],
    ['OPTION_REQUIRED', 400, '옵션 선택 필요'],
    ['OPTION_NOT_ALLOWED', 400, '옵션 미사용 상품'],
    ['STORE_NOT_FOUND', 404, '상점을 찾을 수 없음'],
  ])('%s → %i %s', async (reason, status, message) => {
    sale.mockResolvedValue({ kind: 'INVALID', failure: { ok: false, reason } });
    const res = await post(BODY);
    expect(res.status).toBe(status);
    expect((await res.json()).message).toBe(message);
  });

  it('처리 중 오류는 500', async () => {
    sale.mockRejectedValue(new Error('db down'));
    expect((await post(BODY)).status).toBe(500);
  });
});
