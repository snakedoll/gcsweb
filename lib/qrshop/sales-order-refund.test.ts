// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import {
  PENDING_REFUND_RECHECK_AFTER_MS,
  finalizeRefundFromWebhook,
  reconcilePendingRefunds,
  refundSalesOrder,
} from './sales-order-refund';
import { CANCEL_REASON_SELLER_REFUND } from './sales-orders';

vi.mock('@/lib/db', () => ({ prisma: {} }));

const NOW = new Date('2026-11-12T05:00:00Z');

type Item = { onsiteProductId: string | null; onsiteOptionId: string | null; onsiteOptionName: string | null; quantity: number };

type Setup = {
  paymentStatus?: string;
  paymentMethod?: string;
  cancelReason?: string | null;
  items?: Item[];
  /** 트랜잭션 안에서 다시 읽은 상태(동시 환불 재현용) */
  currentStatus?: string;
  currentReason?: string | null;
  /** 환불 의도 저장(updateMany)이 반영된 행 수. 0이면 그 사이 다른 사람이 처리한 것 */
  intentCount?: number;
  refundRequestedAt?: Date | null;
  refundRestoreStock?: boolean | null;
};

function setup(order: Setup | null) {
  const updatedRow = { id: 'o1', updated: true };
  const status = order?.paymentStatus ?? 'PAID';
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    order: {
      findUnique: vi.fn().mockResolvedValue(
        order && {
          paymentStatus: order.currentStatus ?? status,
          cancelReason: order.currentReason ?? order.cancelReason ?? null,
          items: order.items ?? [],
        },
      ),
      update: vi.fn().mockResolvedValue(updatedRow),
    },
    onsiteProduct: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    onsiteProductOption: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
  };
  const db = {
    order: {
      findFirst: vi.fn().mockResolvedValue(
        order && {
          id: 'o1',
          paymentStatus: status,
          paymentMethod: order.paymentMethod ?? 'ONLINE',
          cancelReason: order.cancelReason ?? null,
          refundRequestedAt: order.refundRequestedAt ?? null,
        },
      ),
      findUnique: vi.fn().mockResolvedValue(
        order && {
          id: 'o1',
          paymentStatus: order.currentStatus ?? status,
          cancelReason: order.currentReason ?? order.cancelReason ?? null,
          refundRequestedAt: order.refundRequestedAt ?? null,
          refundRestoreStock: order.refundRestoreStock ?? null,
        },
      ),
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn().mockResolvedValue({ count: order?.intentCount ?? 1 }),
    },
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const cancelPayment = vi.fn().mockResolvedValue({ success: true });
  const getPayment = vi.fn().mockResolvedValue({ success: true, status: 'CANCELLED' });
  const deps = { db: db as unknown as PrismaClient, cancelPayment, getPayment, now: () => NOW };
  const run = (restoreStock = false) => refundSalesOrder({ orderId: 'o1', storeId: 's1', restoreStock, userId: 'u9' }, deps);
  return { db, tx, cancelPayment, getPayment, deps, run, updatedRow };
}

const INTENT = { refundRequestedAt: NOW, refundRestoreStock: true, refundedByUserId: 'u9' };
const CLEARED = { refundRequestedAt: null, refundRestoreStock: null, refundedByUserId: null };

describe('refundSalesOrder', () => {
  it('다른 상점 주문이거나 없으면 NOT_FOUND (상점으로 거른다)', async () => {
    const t = setup(null);
    expect(await t.run()).toEqual({ kind: 'NOT_FOUND' });
    expect(t.db.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'o1', orderNumber: { storeId: 's1' } } }),
    );
    expect(t.db.order.updateMany).not.toHaveBeenCalled();
  });

  it('이미 판매자 환불된 주문은 ALREADY_REFUNDED', async () => {
    const t = setup({ paymentStatus: 'CANCELED', cancelReason: CANCEL_REASON_SELLER_REFUND });
    expect(await t.run()).toEqual({ kind: 'ALREADY_REFUNDED' });
    expect(t.cancelPayment).not.toHaveBeenCalled();
  });

  it.each([
    ['PENDING', null],
    ['FAILED', null],
    ['CANCELED', 'STOCK_SHORTAGE'],
  ])('결제완료가 아니면(%s) NOT_REFUNDABLE', async (status, reason) => {
    const t = setup({ paymentStatus: status, cancelReason: reason });
    expect(await t.run()).toEqual({ kind: 'NOT_REFUNDABLE' });
    expect(t.cancelPayment).not.toHaveBeenCalled();
  });

  it('PortOne 취소 전에 환불 의도를 저장하되, 아직 요청이 없을 때만 저장한다', async () => {
    const t = setup({ paymentMethod: 'ONLINE' });
    await t.run(true);
    expect(t.db.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'o1', paymentStatus: 'PAID', refundRequestedAt: null },
      data: INTENT,
    });
    const intentAt = t.db.order.updateMany.mock.invocationCallOrder[0];
    expect(intentAt).toBeLessThan(t.cancelPayment.mock.invocationCallOrder[0]);
  });

  it('이미 환불 처리 중인 주문은 누가 눌러도 REFUND_PENDING 이고 요청자·재고 선택을 덮어쓰지 않는다', async () => {
    const t = setup({ paymentMethod: 'ONLINE', refundRequestedAt: new Date('2026-11-12T04:59:00Z') });
    expect(await t.run(true)).toEqual({ kind: 'REFUND_PENDING' });
    expect(t.db.order.updateMany).not.toHaveBeenCalled();
    expect(t.cancelPayment).not.toHaveBeenCalled();
  });

  it('두 사람이 동시에 눌러 의도 저장이 0건이고 주문이 아직 결제완료면 REFUND_PENDING', async () => {
    const t = setup({ intentCount: 0 });
    expect(await t.run()).toEqual({ kind: 'REFUND_PENDING' });
    expect(t.cancelPayment).not.toHaveBeenCalled();
  });

  it('의도를 저장하려는 사이 다른 사람이 환불을 마쳤으면 ALREADY_REFUNDED, PortOne 을 부르지 않는다', async () => {
    const t = setup({ intentCount: 0, currentStatus: 'CANCELED', currentReason: CANCEL_REASON_SELLER_REFUND });
    expect(await t.run()).toEqual({ kind: 'ALREADY_REFUNDED' });
    expect(t.cancelPayment).not.toHaveBeenCalled();
  });

  it('온라인 결제: PortOne 취소 후 CANCELED(SELLER_REFUND) 로 마무리한다', async () => {
    const t = setup({ paymentMethod: 'ONLINE' });
    const result = await t.run();
    expect(t.cancelPayment).toHaveBeenCalledWith({ paymentId: 'o1', reason: '판매자 환불' });
    expect(t.getPayment).not.toHaveBeenCalled();
    expect(t.tx.$queryRaw).toHaveBeenCalled();
    expect(t.tx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'o1' },
        data: { paymentStatus: 'CANCELED', canceledAt: NOW, cancelReason: CANCEL_REASON_SELLER_REFUND },
      }),
    );
    expect(result).toEqual({ kind: 'REFUNDED', order: t.updatedRow, stockNotRestored: 0 });
  });

  describe('PortOne 취소가 실패하면 결제 상태를 다시 조회해 판단한다', () => {
    it.each(['CANCEL_AMOUNT_EXCEEDS_CANCELLABLE_AMOUNT', 'API_ERROR', 'PG_PROVIDER'])(
      '실패(%s) 뒤 조회가 PAID 면 의도를 지우고 CANCEL_FAILED',
      async (code) => {
        const t = setup({ paymentMethod: 'ONLINE' });
        t.cancelPayment.mockResolvedValue({ success: false, code });
        t.getPayment.mockResolvedValue({ success: true, status: 'PAID' });
        expect(await t.run()).toEqual({ kind: 'CANCEL_FAILED', code });
        expect(t.getPayment).toHaveBeenCalledWith('o1');
        expect(t.db.order.updateMany).toHaveBeenLastCalledWith({ where: { id: 'o1', paymentStatus: 'PAID' }, data: CLEARED });
        expect(t.db.$transaction).not.toHaveBeenCalled();
      },
    );

    it.each(['API_ERROR', 'NETWORK_ERROR'])('실패(%s)했어도 조회가 CANCELLED 면 마무리한다', async (code) => {
      const t = setup({ paymentMethod: 'ONLINE' });
      t.cancelPayment.mockResolvedValue({ success: false, code });
      t.getPayment.mockResolvedValue({ success: true, status: 'CANCELLED' });
      expect(await t.run()).toMatchObject({ kind: 'REFUNDED' });
      expect(t.db.order.updateMany).toHaveBeenCalledTimes(1);
      expect(t.tx.order.update).toHaveBeenCalled();
    });

    it('조회도 실패하면 의도를 남기고 REFUND_PENDING', async () => {
      const t = setup({ paymentMethod: 'ONLINE' });
      t.cancelPayment.mockResolvedValue({ success: false, code: 'API_ERROR' });
      t.getPayment.mockResolvedValue({ success: false, code: 'NETWORK_ERROR' });
      expect(await t.run()).toEqual({ kind: 'REFUND_PENDING' });
      expect(t.db.order.updateMany).toHaveBeenCalledTimes(1);
      expect(t.db.$transaction).not.toHaveBeenCalled();
    });

    it('조회가 예외를 던져도 REFUND_PENDING', async () => {
      const t = setup({ paymentMethod: 'ONLINE' });
      t.cancelPayment.mockResolvedValue({ success: false, code: 'API_ERROR' });
      t.getPayment.mockRejectedValue(new TypeError('fetch failed'));
      expect(await t.run()).toEqual({ kind: 'REFUND_PENDING' });
      expect(t.db.order.updateMany).toHaveBeenCalledTimes(1);
    });

    it('조회가 응답하지 않으면 기다리지 않고 REFUND_PENDING', async () => {
      vi.useFakeTimers();
      try {
        const t = setup({ paymentMethod: 'ONLINE' });
        t.cancelPayment.mockResolvedValue({ success: false, code: 'API_ERROR' });
        t.getPayment.mockReturnValue(new Promise(() => {}));
        const pending = t.run();
        await vi.advanceTimersByTimeAsync(10_000);
        expect(await pending).toEqual({ kind: 'REFUND_PENDING' });
      } finally {
        vi.useRealTimers();
      }
    });

    it('응답을 못 받은 실패(NETWORK_ERROR)는 조회가 PAID 여도 취소가 뒤늦게 처리될 수 있어 의도를 남긴다', async () => {
      const t = setup({ paymentMethod: 'ONLINE' });
      t.cancelPayment.mockResolvedValue({ success: false, code: 'NETWORK_ERROR' });
      t.getPayment.mockResolvedValue({ success: true, status: 'PAID' });
      expect(await t.run()).toEqual({ kind: 'REFUND_PENDING' });
      expect(t.db.order.updateMany).toHaveBeenCalledTimes(1);
    });
  });

  it('온라인 결제: 취소 뒤 마무리 트랜잭션이 실패하면 의도를 남기고 REFUND_PENDING (웹훅·목록 확인이 마무리)', async () => {
    const t = setup({ paymentMethod: 'ONLINE' });
    t.db.$transaction.mockRejectedValue(new Error('db down'));
    expect(await t.run()).toEqual({ kind: 'REFUND_PENDING' });
    expect(t.db.order.updateMany).toHaveBeenCalledTimes(1);
  });

  it('현장 결제: PortOne 을 부르지 않고 의도 저장 후 기록만 바꾼다', async () => {
    const t = setup({ paymentMethod: 'ON_SITE' });
    expect((await t.run()).kind).toBe('REFUNDED');
    expect(t.cancelPayment).not.toHaveBeenCalled();
    expect(t.getPayment).not.toHaveBeenCalled();
    expect(t.db.order.updateMany).toHaveBeenCalledTimes(1);
    expect(t.tx.order.update).toHaveBeenCalled();
  });

  it('현장 결제: 마무리가 실패하면 의도를 지워 처리 중으로 남지 않게 하고 오류를 올린다', async () => {
    const t = setup({ paymentMethod: 'ON_SITE' });
    t.db.$transaction.mockRejectedValue(new Error('db down'));
    await expect(t.run()).rejects.toThrow('db down');
    expect(t.db.order.updateMany).toHaveBeenCalledTimes(2);
    expect(t.db.order.updateMany).toHaveBeenLastCalledWith({ where: { id: 'o1', paymentStatus: 'PAID' }, data: CLEARED });
  });

  it('재고 유지면 재고를 건드리지 않는다', async () => {
    const t = setup({ items: [{ onsiteProductId: 'p1', onsiteOptionId: 'op1', onsiteOptionName: 'S', quantity: 2 }] });
    await t.run(false);
    expect(t.tx.onsiteProduct.updateMany).not.toHaveBeenCalled();
    expect(t.tx.onsiteProductOption.updateMany).not.toHaveBeenCalled();
  });

  it('재고 복원: 옵션 재고와 상품 재고를 주문 수량만큼 되돌린다', async () => {
    const t = setup({
      items: [
        { onsiteProductId: 'p1', onsiteOptionId: 'op1', onsiteOptionName: 'S', quantity: 2 },
        { onsiteProductId: 'p2', onsiteOptionId: null, onsiteOptionName: null, quantity: 1 },
      ],
    });
    const result = await t.run(true);
    expect(t.tx.onsiteProductOption.updateMany).toHaveBeenCalledTimes(1);
    expect(t.tx.onsiteProductOption.updateMany).toHaveBeenCalledWith({
      where: { optionId: 'op1' },
      data: { currentStock: { increment: 2 } },
    });
    expect(t.tx.onsiteProduct.updateMany).toHaveBeenNthCalledWith(1, {
      where: { productId: 'p1' },
      data: { currentStock: { increment: 2 } },
    });
    expect(t.tx.onsiteProduct.updateMany).toHaveBeenNthCalledWith(2, {
      where: { productId: 'p2' },
      data: { currentStock: { increment: 1 } },
    });
    expect(result).toMatchObject({ kind: 'REFUNDED', stockNotRestored: 0 });
  });

  it('재고 복원: 옵션 연결이 끊긴 항목·삭제된 상품은 건너뛰고 개수를 센다', async () => {
    const t = setup({
      items: [
        { onsiteProductId: 'p1', onsiteOptionId: null, onsiteOptionName: 'S', quantity: 2 },
        { onsiteProductId: null, onsiteOptionId: null, onsiteOptionName: null, quantity: 1 },
      ],
    });
    const result = await t.run(true);
    expect(t.tx.onsiteProduct.updateMany).not.toHaveBeenCalled();
    expect(result).toMatchObject({ kind: 'REFUNDED', stockNotRestored: 2 });
  });

  it('마무리 직전에 다른 경로(웹훅)가 먼저 마무리했으면 다시 반영하지 않는다', async () => {
    const t = setup({ paymentMethod: 'ON_SITE', currentStatus: 'CANCELED', currentReason: CANCEL_REASON_SELLER_REFUND });
    // 의도 저장 시점에는 아직 결제완료였다(intentCount 1)
    expect(await t.run(true)).toEqual({ kind: 'ALREADY_REFUNDED' });
    expect(t.tx.order.update).not.toHaveBeenCalled();
    expect(t.tx.onsiteProduct.updateMany).not.toHaveBeenCalled();
  });
});

describe('reconcilePendingRefunds (전체 주문 조회를 열 때 처리 중 환불 확인)', () => {
  const REQUESTED = new Date(NOW.getTime() - PENDING_REFUND_RECHECK_AFTER_MS - 1000);
  const pendingRow = (over: Record<string, unknown> = {}) => ({
    id: 'o1',
    paymentMethod: 'ONLINE',
    refundRequestedAt: REQUESTED,
    refundRestoreStock: true,
    ...over,
  });
  const reconcile = (t: ReturnType<typeof setup>) => reconcilePendingRefunds({ storeId: 's1', timeKey: '261112' }, t.deps);

  it('그 상점·그날의 처리 중 주문 중, 요청 뒤 일정 시간이 지난 것만 확인한다', async () => {
    const t = setup({ items: [] });
    expect(await reconcile(t)).toBe(0);
    expect(t.db.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          orderNumber: { storeId: 's1', orderTimeKey: '261112' },
          paymentStatus: 'PAID',
          refundRequestedAt: { not: null, lte: new Date(NOW.getTime() - PENDING_REFUND_RECHECK_AFTER_MS) },
        },
      }),
    );
    expect(t.getPayment).not.toHaveBeenCalled();
  });

  it('PortOne 이 CANCELLED 면 저장된 재고 복원 선택대로 마무리한다', async () => {
    const t = setup({ items: [{ onsiteProductId: 'p1', onsiteOptionId: null, onsiteOptionName: null, quantity: 3 }] });
    t.db.order.findMany.mockResolvedValue([pendingRow()]);
    expect(await reconcile(t)).toBe(1);
    expect(t.getPayment).toHaveBeenCalledWith('o1');
    expect(t.tx.onsiteProduct.updateMany).toHaveBeenCalledWith({ where: { productId: 'p1' }, data: { currentStock: { increment: 3 } } });
    expect(t.tx.order.update).toHaveBeenCalled();
  });

  it('PortOne 이 PAID 면 그 요청의 의도만 지운다', async () => {
    const t = setup({});
    t.db.order.findMany.mockResolvedValue([pendingRow()]);
    t.getPayment.mockResolvedValue({ success: true, status: 'PAID' });
    expect(await reconcile(t)).toBe(1);
    expect(t.db.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'o1', paymentStatus: 'PAID', refundRequestedAt: REQUESTED },
      data: CLEARED,
    });
    expect(t.db.$transaction).not.toHaveBeenCalled();
  });

  it('조회가 실패하면 그대로 둔다', async () => {
    const t = setup({});
    t.db.order.findMany.mockResolvedValue([pendingRow()]);
    t.getPayment.mockResolvedValue({ success: false, code: 'NETWORK_ERROR' });
    expect(await reconcile(t)).toBe(0);
    expect(t.db.order.updateMany).not.toHaveBeenCalled();
    expect(t.db.$transaction).not.toHaveBeenCalled();
  });

  it('현장 결제의 처리 중이 남아 있으면(요청이 중간에 끊김) PortOne 없이 의도를 지운다', async () => {
    const t = setup({});
    t.db.order.findMany.mockResolvedValue([pendingRow({ paymentMethod: 'ON_SITE' })]);
    expect(await reconcile(t)).toBe(1);
    expect(t.getPayment).not.toHaveBeenCalled();
    expect(t.db.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'o1', paymentStatus: 'PAID', refundRequestedAt: REQUESTED },
      data: CLEARED,
    });
  });

  it('한 주문의 확인이 실패해도 나머지는 확인한다', async () => {
    const t = setup({});
    t.db.order.findMany.mockResolvedValue([pendingRow({ id: 'o1' }), pendingRow({ id: 'o2' })]);
    t.getPayment.mockImplementation(async (id: string) => {
      if (id === 'o1') throw new Error('boom');
      return { success: true, status: 'PAID' };
    });
    expect(await reconcile(t)).toBe(1);
    expect(t.db.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'o2' }) }),
    );
  });
});

describe('finalizeRefundFromWebhook', () => {
  const pendingOrder = (over: Partial<Setup> = {}): Setup => ({
    refundRequestedAt: new Date('2026-11-12T04:59:00Z'),
    refundRestoreStock: true,
    items: [{ onsiteProductId: 'p1', onsiteOptionId: null, onsiteOptionName: null, quantity: 1 }],
    ...over,
  });

  it('환불 의도가 없는 주문(품절 자동 환불·콘솔 취소 등)은 대상이 아니다', async () => {
    const t = setup({ refundRequestedAt: null });
    expect(await finalizeRefundFromWebhook('o1', t.deps)).toEqual({ kind: 'NOT_TARGET' });
    expect(t.getPayment).not.toHaveBeenCalled();
  });

  it('이미 마무리된 주문은 대상이 아니다', async () => {
    const t = setup(pendingOrder({ paymentStatus: 'CANCELED', cancelReason: CANCEL_REASON_SELLER_REFUND }));
    expect(await finalizeRefundFromWebhook('o1', t.deps)).toEqual({ kind: 'NOT_TARGET' });
  });

  it('PortOne 에서 실제로 취소됐는지 확인한 뒤 저장된 재고 복원 선택대로 마무리한다', async () => {
    const t = setup(pendingOrder());
    const result = await finalizeRefundFromWebhook('o1', t.deps);
    expect(t.getPayment).toHaveBeenCalledWith('o1');
    expect(t.tx.onsiteProduct.updateMany).toHaveBeenCalledWith({ where: { productId: 'p1' }, data: { currentStock: { increment: 1 } } });
    expect(result).toMatchObject({ kind: 'REFUNDED' });
  });

  it('PortOne 상태가 취소가 아니면 아무것도 바꾸지 않는다', async () => {
    const t = setup(pendingOrder());
    t.getPayment.mockResolvedValue({ success: true, status: 'PAID' });
    expect(await finalizeRefundFromWebhook('o1', t.deps)).toEqual({ kind: 'NOT_CANCELLED', portoneStatus: 'PAID' });
    expect(t.db.$transaction).not.toHaveBeenCalled();
  });

  it('PortOne 조회가 실패하면 LOOKUP_FAILED (웹훅이 500 을 돌려 재전송받는다)', async () => {
    const t = setup(pendingOrder());
    t.getPayment.mockResolvedValue({ success: false, code: 'NETWORK_ERROR' });
    expect(await finalizeRefundFromWebhook('o1', t.deps)).toEqual({ kind: 'LOOKUP_FAILED', code: 'NETWORK_ERROR' });
  });
});
