import { afterEach, expect, it, vi } from 'vitest';
import { createOrdersApiService } from './orders-api-service';

afterEach(() => vi.unstubAllGlobals());

it('직원 상점, 날짜, 검색, 페이지, 환불완료 필터를 전달하고 서버 페이지 정보를 유지한다', async () => {
  const data = { orders: [], total: 35, page: 2, pageSize: 30, openedOn: '2026-10-01', today: '2026-11-25' };
  const fetcher = vi.fn().mockResolvedValue(Response.json({ status: 'success', data }));
  vi.stubGlobal('fetch', fetcher);
  const service = createOrdersApiService('staffshop');
  await expect(service.listOrders({ date: '2026-11-25', channel: 'all', search: '엽서 +', page: 2, refundedOnly: true })).resolves.toEqual(data);
  const url = new URL(fetcher.mock.calls[0][0], 'http://localhost');
  expect(url.pathname).toBe('/api/v2/qrshop/sales-orders');
  expect(Object.fromEntries(url.searchParams)).toEqual({
    date: '2026-11-25', channel: 'all', q: '엽서 +', page: '2', refundedOnly: 'true', storeSlug: 'staffshop',
  });
});

it('재고복원 선택과 실제 누락된 항목 수를 보존한다', async () => {
  const data = { id: 'order/1', refundStatus: 'refunded', refundRestoreStock: true, stockNotRestored: 1 };
  const fetcher = vi.fn().mockResolvedValue(Response.json({ status: 'success', data }));
  vi.stubGlobal('fetch', fetcher);
  await expect(createOrdersApiService().refundOrder('order/1', true)).resolves.toEqual(data);
  expect(fetcher).toHaveBeenCalledWith('/api/v2/qrshop/sales-orders/order%2F1/refund', expect.objectContaining({
    method: 'POST', body: '{"restoreStock":true}',
  }));
});
