import { beforeEach, describe, expect, it } from 'vitest';
import { clearQrshopMockOrders, createQrshopMockService } from './qrshop-service';

const draft = {
  lines: [
    {
      productId: 'keyring-black',
      productName: '무슨무슨 키링',
      option: 'BLACK',
      quantity: 2,
      unitPrice: 15_000,
    },
  ],
  buyerName: '김잇장',
  buyerPhone: '010-1234-5678',
  paymentMethod: 'online' as const,
};

describe('QRshop Mock Service', () => {
  beforeEach(() => clearQrshopMockOrders());

  it('카탈로그 정상·빈 상태를 같은 계약으로 반환한다', async () => {
    const normal = createQrshopMockService({ delayMs: 0 });
    const empty = createQrshopMockService({
      catalogScenario: { kind: 'empty', data: { items: [], total: 0 } },
      delayMs: 0,
    });

    await expect(normal.getCatalog()).resolves.toEqual(
      expect.objectContaining({ total: expect.any(Number) }),
    );
    await expect(empty.getCatalog()).resolves.toEqual({ items: [], total: 0 });
  });

  it('카탈로그 오류 상태를 전달한다', async () => {
    const service = createQrshopMockService({
      catalogScenario: { kind: 'error', message: '카탈로그 오류' },
      delayMs: 0,
    });

    await expect(service.getCatalog()).rejects.toThrow('카탈로그 오류');
  });

  it('주문 합계를 계산하고 결제 실패 후 성공으로 재시도한다', async () => {
    const service = createQrshopMockService({ delayMs: 0 });
    const created = await service.createOrder(draft);

    expect(created).toEqual(
      expect.objectContaining({
        status: 'pending',
        totalAmount: 30_000,
        buyerName: '김잇장',
      }),
    );

    const failed = await service.processPayment(created.orderId, 'failure');
    expect(failed.status).toBe('failed');
    expect(failed.failureMessage).toContain('실패');

    const paid = await service.processPayment(created.orderId, 'success');
    expect(paid.status).toBe('paid');
    expect(paid.failureMessage).toBeUndefined();
    await expect(service.getOrder(created.orderId)).resolves.toEqual(
      expect.objectContaining({ status: 'paid' }),
    );
  });

  it('주문자 정보가 올바르지 않으면 주문을 만들지 않는다', async () => {
    const service = createQrshopMockService({ delayMs: 0 });
    await expect(
      service.createOrder({ ...draft, buyerPhone: '1234' }),
    ).rejects.toThrow('휴대폰 번호');
  });
});
