// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { refundSalesOrder } from './sales-order-refund';
import { CANCEL_REASON_SELLER_REFUND } from './sales-orders';

vi.mock('@/lib/db', () => ({ prisma: {} }));

const NOW = new Date('2026-11-12T05:00:00Z');

type Item = { onsiteProductId: string | null; onsiteOptionId: string | null; onsiteOptionName: string | null; quantity: number };

function setup(order: {
  paymentStatus?: string;
  paymentMethod?: string;
  cancelReason?: string | null;
  items?: Item[];
  /** 트랜잭션 안에서 다시 읽은 상태(동시 환불 재현용) */
  currentStatus?: string;
  currentReason?: string | null;
} | null) {
  const updatedRow = { id: 'o1', updated: true };
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    order: {
      findUnique: vi.fn().mockResolvedValue(
        order && {
          paymentStatus: order.currentStatus ?? order.paymentStatus ?? 'PAID',
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
          paymentStatus: order.paymentStatus ?? 'PAID',
          paymentMethod: order.paymentMethod ?? 'ONLINE',
          cancelReason: order.cancelReason ?? null,
        },
      ),
    },
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const cancelPayment = vi.fn().mockResolvedValue({ success: true });
  const run = (restoreStock = false) =>
    refundSalesOrder(
      { orderId: 'o1', storeId: 's1', restoreStock },
      { db: db as unknown as PrismaClient, cancelPayment, now: () => NOW },
    );
  return { db, tx, cancelPayment, run, updatedRow };
}

describe('refundSalesOrder', () => {
  it('다른 상점 주문이거나 없으면 NOT_FOUND (상점으로 거른다)', async () => {
    const t = setup(null);
    expect(await t.run()).toEqual({ kind: 'NOT_FOUND' });
    expect(t.db.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'o1', orderNumber: { storeId: 's1' } } }),
    );
    expect(t.cancelPayment).not.toHaveBeenCalled();
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

  it('온라인 결제: PortOne 취소 후 CANCELED(SELLER_REFUND) 로 바꾼다', async () => {
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

  it('PortOne 취소가 실패하면 주문을 바꾸지 않는다', async () => {
    const t = setup({ paymentMethod: 'ONLINE' });
    t.cancelPayment.mockResolvedValue({ success: false, code: 'NETWORK_ERROR' });
    expect(await t.run()).toEqual({ kind: 'CANCEL_FAILED', code: 'NETWORK_ERROR' });
    expect(t.db.$transaction).not.toHaveBeenCalled();
  });

  it('현장 결제: PortOne 을 부르지 않고 기록만 바꾼다', async () => {
    const t = setup({ paymentMethod: 'ON_SITE' });
    expect((await t.run()).kind).toBe('REFUNDED');
    expect(t.cancelPayment).not.toHaveBeenCalled();
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

  it('동시에 다른 사람이 먼저 환불했으면 다시 반영하지 않는다', async () => {
    const t = setup({ paymentMethod: 'ON_SITE', currentStatus: 'CANCELED', currentReason: CANCEL_REASON_SELLER_REFUND });
    expect(await t.run(true)).toEqual({ kind: 'ALREADY_REFUNDED' });
    expect(t.tx.order.update).not.toHaveBeenCalled();
    expect(t.tx.onsiteProduct.updateMany).not.toHaveBeenCalled();
  });
});
