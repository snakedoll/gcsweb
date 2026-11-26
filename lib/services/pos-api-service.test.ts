import { afterEach, expect, it, vi } from 'vitest';
import { createPosApiService } from './pos-api-service';
import { posLineKey } from './pos-service';

const line = { productId: 'product', productName: '엽서', optionId: 'option', option: '빨강', quantity: 2, unitPrice: 1500 };
const receipt = { orderId: 'order', orderCode: '007', lines: [line], totalAmount: 3000, paymentMethod: 'transfer' };

afterEach(() => vi.unstubAllGlobals());

it('재시도는 같은 키로 서버 주문을 확인하고 다음 결제는 새 키를 사용한다', async () => {
  const fetcher = vi.fn().mockRejectedValueOnce(new TypeError('network failure'))
    .mockImplementation(() => Response.json({ status: 'success', data: receipt }));
  vi.stubGlobal('fetch', fetcher);
  const service = createPosApiService('staffshop', 'store');
  await expect(service.completeSale([line], 'transfer')).rejects.toThrow('network failure');
  await expect(service.completeSale([line], 'transfer')).resolves.toEqual(receipt);
  await service.completeSale([line], 'transfer');

  const bodies = fetcher.mock.calls.map(([, init]) => JSON.parse(init.body));
  expect(fetcher.mock.calls[0][0]).toBe('/api/v2/qrshop/pos/orders?storeSlug=staffshop');
  expect(bodies[0]).toEqual({
    clientRequestId: expect.any(String), paymentMethod: 'transfer',
    items: [{ productId: 'product', optionId: 'option', quantity: 2 }],
  });
  expect(bodies[1].clientRequestId).toBe(bodies[0].clientRequestId);
  expect(bodies[2].clientRequestId).not.toBe(bodies[0].clientRequestId);
});

it('품절 응답은 서버 상품·옵션 정보와 정확한 장바구니 줄을 전달한다', async () => {
  const item = { productId: 'product', optionId: 'option', name: '엽서', optionName: '빨강', availableQuantity: 1 };
  const fetcher = vi.fn().mockResolvedValue(Response.json({
    status: 'error', code: 'SOLD_OUT', message: '품절된 상품', data: { soldOutItems: [item] },
  }, { status: 409 }));
  vi.stubGlobal('fetch', fetcher);
  await expect(createPosApiService().completeSale([line], 'card')).rejects.toMatchObject({
    name: 'PosStockChangedError', unavailableLineKeys: [posLineKey(line)], items: [item],
  });
});

it('할인 계약이 확정되기 전 할인된 결제는 서버로 전송하지 않는다', async () => {
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  await expect(createPosApiService().completeSale([{ ...line, discountAmount: 500 }], 'cash')).rejects.toThrow('할인');
  expect(fetcher).not.toHaveBeenCalled();
});
