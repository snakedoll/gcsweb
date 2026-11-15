// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { Prisma, type PrismaClient } from '@prisma/client';
import { completePosSale, type PosPaymentMethod } from './pos-sale';

vi.mock('@/lib/db', () => ({ prisma: {} }));

// 2026-11-13 10:30 KST
const NOW = new Date('2026-11-13T01:30:00Z');

const PLAIN = { productId: 'p1', name: '엽서', price: 1000, hasOption: false, currentStock: 10, options: [] };
const WITH_OPTION = {
  productId: 'p2',
  name: '반다나',
  price: 5000,
  hasOption: true,
  currentStock: 6,
  options: [
    { optionId: 'o1', name: '빨강', surcharge: 500, currentStock: 3 },
    { optionId: 'o2', name: '파랑', surcharge: 0, currentStock: 3 },
  ],
};

/** 이미 처리된 결제(같은 요청 키)의 주문 행 */
const earlierRow = (storeId = 's1') => ({
  id: 'ord0',
  paymentAmount: 2000,
  onsitePaymentType: 'CASH',
  orderNumber: { storeId, orderNo: 7 },
  items: [
    { onsiteProductId: 'p1', onsiteOptionId: null, onsiteProductName: '엽서', onsiteOptionName: null, quantity: 2, price: 1000 },
  ],
});

const conflictOn = (field: string) =>
  new Prisma.PrismaClientKnownRequestError('unique', {
    code: 'P2002',
    clientVersion: '5.22.0',
    meta: { target: field === 'orderNo' ? ['storeId', 'orderTimeKey', 'orderNo'] : [field] },
  });

function setup(opts: { products?: unknown[]; maxOrderNo?: number | null; decrementCount?: number; stockAfter?: number } = {}) {
  const tx = {
    store: { findUnique: vi.fn().mockResolvedValue({ storeId: 's1', name: '잇장샵', storeSlug: 'itjang' }) },
    onsiteProduct: {
      findMany: vi.fn().mockResolvedValue(opts.products ?? [PLAIN, WITH_OPTION]),
      updateMany: vi.fn().mockResolvedValue({ count: opts.decrementCount ?? 1 }),
      findUnique: vi.fn().mockResolvedValue({ currentStock: opts.stockAfter ?? 0 }),
    },
    onsiteProductOption: {
      updateMany: vi.fn().mockResolvedValue({ count: opts.decrementCount ?? 1 }),
      findUnique: vi.fn().mockResolvedValue({ currentStock: opts.stockAfter ?? 0 }),
    },
    order: { create: vi.fn().mockResolvedValue({ id: 'ord1' }) },
    orderNumber: {
      aggregate: vi.fn().mockResolvedValue({ _max: { orderNo: opts.maxOrderNo === undefined ? 3 : opts.maxOrderNo } }),
      create: vi.fn().mockResolvedValue({}),
    },
    $executeRaw: vi.fn().mockResolvedValue(1),
  };
  const db = {
    order: { findUnique: vi.fn().mockResolvedValue(null) },
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const run = (
    items: { productId: string; optionId?: string | null; quantity: number }[],
    paymentMethod: PosPaymentMethod = 'card',
    clientRequestId = 'req-0001',
  ) =>
    completePosSale(
      { storeId: 's1', storeSlug: 'itjang', items, paymentMethod, clientRequestId, soldByUserId: 'u7' },
      { db: db as unknown as PrismaClient, now: () => NOW },
    );
  return { tx, db, run };
}

describe('completePosSale', () => {
  it('결제완료·수령완료 현장결제 주문을 만들고 주문 시점의 상품명·옵션명·단가, 요청 키, 등록자를 남긴다', async () => {
    const t = setup();
    const result = await t.run([
      { productId: 'p1', quantity: 2 },
      { productId: 'p2', optionId: 'o1', quantity: 1 },
    ]);
    expect(t.tx.order.create).toHaveBeenCalledWith({
      data: {
        paymentAmount: 2 * 1000 + 5500,
        paymentMethod: 'ON_SITE',
        onsitePaymentType: 'CARD',
        paymentStatus: 'PAID',
        receiptStatus: 'RECEIVED',
        paidAt: NOW,
        buyerType: 'GUEST',
        clientRequestId: 'req-0001',
        soldByUserId: 'u7',
        items: {
          create: [
            { quantity: 2, price: 1000, onsiteProductId: 'p1', onsiteOptionId: null, onsiteProductName: '엽서', onsiteOptionName: null },
            { quantity: 1, price: 5500, onsiteProductId: 'p2', onsiteOptionId: 'o1', onsiteProductName: '반다나', onsiteOptionName: '빨강' },
          ],
        },
      },
      select: { id: true },
    });
    expect(result).toEqual({
      kind: 'COMPLETED',
      replayed: false,
      receipt: {
        orderId: 'ord1',
        orderCode: '004',
        lines: [
          { productId: 'p1', productName: '엽서', quantity: 2, unitPrice: 1000 },
          { productId: 'p2', optionId: 'o1', productName: '반다나', option: '빨강', quantity: 1, unitPrice: 5500 },
        ],
        totalAmount: 7500,
        paymentMethod: 'card',
      },
    });
  });

  it('주문번호: 상점·KST 일자별 다음 순번, 유형 ONSITE', async () => {
    const t = setup({ maxOrderNo: null });
    const result = await t.run([{ productId: 'p1', quantity: 1 }]);
    expect(t.tx.orderNumber.create).toHaveBeenCalledWith({
      data: { orderId: 'ord1', orderNo: 1, type: 'ONSITE', storeId: 's1', orderTimeKey: '261113' },
    });
    expect(result).toMatchObject({ kind: 'COMPLETED', receipt: { orderCode: '001' } });
  });

  it('재고를 먼저 차감하고 그 뒤에 번호를 발급한다(번호 잠금을 짧게)', async () => {
    const t = setup();
    await t.run([{ productId: 'p1', quantity: 1 }]);
    const decrementAt = t.tx.onsiteProduct.updateMany.mock.invocationCallOrder[0];
    const lockAt = t.tx.$executeRaw.mock.invocationCallOrder[0];
    expect(decrementAt).toBeLessThan(lockAt);
  });

  it.each([
    ['cash', 'CASH'],
    ['transfer', 'TRANSFER'],
  ] as const)('결제수단 %s → onsitePaymentType %s', async (method, type) => {
    const t = setup();
    await t.run([{ productId: 'p1', quantity: 1 }], method);
    expect(t.tx.order.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ onsitePaymentType: type }) }),
    );
  });

  it('같은 상품·옵션이 여러 줄로 오면 합쳐서 한 항목으로 남긴다', async () => {
    const t = setup();
    await t.run([
      { productId: 'p1', quantity: 1 },
      { productId: 'p1', quantity: 2 },
    ]);
    const items = t.tx.order.create.mock.calls[0][0].data.items.create;
    expect(items).toEqual([expect.objectContaining({ onsiteProductId: 'p1', quantity: 3 })]);
  });

  it('재고를 조건부로 차감한다: 옵션 상품은 옵션과 상품 재고를 함께', async () => {
    const t = setup();
    await t.run([
      { productId: 'p1', quantity: 2 },
      { productId: 'p2', optionId: 'o1', quantity: 1 },
    ]);
    expect(t.tx.onsiteProductOption.updateMany).toHaveBeenCalledWith({
      where: { optionId: 'o1', currentStock: { gte: 1 } },
      data: { currentStock: { decrement: 1 } },
    });
    expect(t.tx.onsiteProduct.updateMany).toHaveBeenNthCalledWith(1, {
      where: { productId: 'p1', currentStock: { gte: 2 } },
      data: { currentStock: { decrement: 2 } },
    });
    expect(t.tx.onsiteProduct.updateMany).toHaveBeenNthCalledWith(2, {
      where: { productId: 'p2', currentStock: { gte: 1 } },
      data: { currentStock: { decrement: 1 } },
    });
  });

  it('담을 때 이미 재고가 모자라면 주문을 만들지 않고 SOLD_OUT', async () => {
    const t = setup();
    const result = await t.run([{ productId: 'p2', optionId: 'o2', quantity: 5 }]);
    expect(result).toEqual({
      kind: 'SOLD_OUT',
      soldOutItems: [{ productId: 'p2', optionId: 'o2', name: '반다나', optionName: '파랑', availableQuantity: 3 }],
    });
    expect(t.tx.order.create).not.toHaveBeenCalled();
  });

  it('확인과 차감 사이에 다른 결제가 재고를 가져가면 되돌리고 SOLD_OUT, 번호 잠금은 잡지 않는다', async () => {
    const t = setup({ decrementCount: 0, stockAfter: 1 });
    const result = await t.run([{ productId: 'p1', quantity: 2 }]);
    expect(result).toEqual({
      kind: 'SOLD_OUT',
      soldOutItems: [{ productId: 'p1', optionId: null, name: '엽서', optionName: null, availableQuantity: 1 }],
    });
    await expect(t.db.$transaction.mock.results[0].value).rejects.toThrow('POS_STOCK_SHORTAGE');
    expect(t.tx.$executeRaw).not.toHaveBeenCalled();
    expect(t.tx.orderNumber.create).not.toHaveBeenCalled();
  });

  it('다른 상점 상품이거나 없는 상품이면 INVALID PRODUCT_NOT_FOUND', async () => {
    const t = setup({ products: [PLAIN] });
    expect(await t.run([{ productId: 'p9', quantity: 1 }])).toEqual({
      kind: 'INVALID',
      failure: { ok: false, reason: 'PRODUCT_NOT_FOUND' },
    });
    expect(t.tx.order.create).not.toHaveBeenCalled();
  });

  it('옵션 상품을 옵션 없이 담으면 INVALID OPTION_REQUIRED', async () => {
    const t = setup();
    expect(await t.run([{ productId: 'p2', quantity: 1 }])).toMatchObject({ kind: 'INVALID', failure: { reason: 'OPTION_REQUIRED' } });
  });

  it('주문번호가 동시에 겹치면(unique 충돌) 트랜잭션째 다시 시도한다', async () => {
    const t = setup();
    t.db.$transaction.mockRejectedValueOnce(conflictOn('orderNo'));
    const result = await t.run([{ productId: 'p1', quantity: 1 }]);
    expect(t.db.$transaction).toHaveBeenCalledTimes(2);
    expect(result.kind).toBe('COMPLETED');
  });

  describe('같은 결제가 두 번 처리되지 않게 (요청 키)', () => {
    it('같은 요청 키로 이미 처리된 결제가 있으면 새로 만들지 않고 처음 영수증을 돌려준다', async () => {
      const t = setup();
      t.db.order.findUnique.mockResolvedValue(earlierRow());
      const result = await t.run([{ productId: 'p1', quantity: 2 }], 'cash', 'req-dup');
      expect(t.db.order.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { clientRequestId: 'req-dup' } }));
      expect(t.db.$transaction).not.toHaveBeenCalled();
      expect(result).toEqual({
        kind: 'COMPLETED',
        replayed: true,
        receipt: {
          orderId: 'ord0',
          orderCode: '007',
          lines: [{ productId: 'p1', productName: '엽서', quantity: 2, unitPrice: 1000 }],
          totalAmount: 2000,
          paymentMethod: 'cash',
        },
      });
    });

    it('같은 키가 동시에 와서 나중 요청이 unique 충돌로 끝나면, 먼저 끝난 결제의 영수증을 돌려준다', async () => {
      const t = setup();
      t.db.order.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(earlierRow());
      t.db.$transaction.mockRejectedValueOnce(conflictOn('clientRequestId'));
      const result = await t.run([{ productId: 'p1', quantity: 2 }]);
      expect(t.db.$transaction).toHaveBeenCalledTimes(1); // 번호 충돌처럼 재시도하지 않는다
      expect(result).toMatchObject({ kind: 'COMPLETED', replayed: true, receipt: { orderId: 'ord0' } });
    });

    it('요청 키가 다른 상점 결제에 쓰였으면 REQUEST_ID_CONFLICT (그 영수증을 보여 주지 않는다)', async () => {
      const t = setup();
      t.db.order.findUnique.mockResolvedValue(earlierRow('s2'));
      expect(await t.run([{ productId: 'p1', quantity: 1 }])).toEqual({ kind: 'REQUEST_ID_CONFLICT' });
      expect(t.db.$transaction).not.toHaveBeenCalled();
    });
  });
});
