// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { finalizeRefundFromWebhook, refundSalesOrder } from './sales-order-refund';
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
        order && { id: 'o1', paymentStatus: status, paymentMethod: order.paymentMethod ?? 'ONLINE', cancelReason: order.cancelReason ?? null },
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

  it('PortOne 취소 전에 환불 의도(요청 시각·재고 복원 선택·요청자)를 먼저 저장한다', async () => {
    const t = setup({ paymentMethod: 'ONLINE' });
    await t.run(true);
    expect(t.db.order.updateMany).toHaveBeenCalledWith({ where: { id: 'o1', paymentStatus: 'PAID' }, data: INTENT });
    const intentAt = t.db.order.updateMany.mock.invocationCallOrder[0];
    expect(intentAt).toBeLessThan(t.cancelPayment.mock.invocationCallOrder[0]);
  });

  it('의도를 저장하려는 사이 다른 사람이 환불했으면 PortOne 을 부르지 않는다', async () => {
    const t = setup({ intentCount: 0, currentStatus: 'CANCELED', currentReason: CANCEL_REASON_SELLER_REFUND });
    expect(await t.run()).toEqual({ kind: 'ALREADY_REFUNDED' });
    expect(t.cancelPayment).not.toHaveBeenCalled();
  });

  it('온라인 결제: PortOne 취소 후 CANCELED(SELLER_REFUND) 로 마무리한다', async () => {
    const t = setup({ paymentMethod: 'ONLINE' });
    const result = await t.run();
    expect(t.cancelPayment).toHaveBeenCalledWith({ paymentId: 'o1', reason: '판매자 환불' });
    expect(t.tx.$queryRaw).toHaveBeenCalled();
    expect(t.tx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'o1' },
        data: { paymentStatus: 'CANCELED', canceledAt: NOW, cancelReason: CANCEL_REASON_SELLER_REFUND },
      }),
    );
    expect(result).toEqual({ kind: 'REFUNDED', order: t.updatedRow, stockNotRestored: 0 });
  });

  it('PortOne 이 거절하면 의도를 지우고 주문은 결제완료 그대로', async () => {
    const t = setup({ paymentMethod: 'ONLINE' });
    t.cancelPayment.mockResolvedValue({ success: false, code: 'CANCEL_AMOUNT_EXCEEDS_CANCELLABLE_AMOUNT' });
    expect(await t.run()).toEqual({ kind: 'CANCEL_FAILED', code: 'CANCEL_AMOUNT_EXCEEDS_CANCELLABLE_AMOUNT', intentKept: false });
    expect(t.db.order.updateMany).toHaveBeenLastCalledWith({ where: { id: 'o1', paymentStatus: 'PAID' }, data: CLEARED });
    expect(t.db.$transaction).not.toHaveBeenCalled();
  });

  it('PortOne 응답을 못 받으면(네트워크 오류) 의도를 남겨 웹훅·재요청이 마무리하게 한다', async () => {
    const t = setup({ paymentMethod: 'ONLINE' });
    t.cancelPayment.mockResolvedValue({ success: false, code: 'NETWORK_ERROR' });
    expect(await t.run()).toEqual({ kind: 'CANCEL_FAILED', code: 'NETWORK_ERROR', intentKept: true });
    expect(t.db.order.updateMany).toHaveBeenCalledTimes(1); // 저장만 하고 지우지 않는다
    expect(t.db.$transaction).not.toHaveBeenCalled();
  });

  it('마무리 트랜잭션이 실패하면 오류를 그대로 올리고 의도는 지우지 않는다', async () => {
    const t = setup({ paymentMethod: 'ONLINE' });
    t.db.$transaction.mockRejectedValue(new Error('db down'));
    await expect(t.run()).rejects.toThrow('db down');
    expect(t.db.order.updateMany).toHaveBeenCalledTimes(1);
  });

  it('현장 결제: PortOne 을 부르지 않고 의도 저장 후 기록만 바꾼다', async () => {
    const t = setup({ paymentMethod: 'ON_SITE' });
    expect((await t.run()).kind).toBe('REFUNDED');
    expect(t.cancelPayment).not.toHaveBeenCalled();
    expect(t.db.order.updateMany).toHaveBeenCalledTimes(1);
    expect(t.tx.order.update).toHaveBeenCalled();
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
