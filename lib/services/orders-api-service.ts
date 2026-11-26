import { requestSalesApi, withOperationalStore } from './sales-management-api-client';
import type { OrdersResult, OrdersService, SalesOrder } from './orders-service';

export function createOrdersApiService(storeSlug?: string): OrdersService {
  return {
    dataSource: 'api',
    listOrders(query) {
      const params = new URLSearchParams({
        date: query.date, channel: query.channel, q: query.search, page: String(query.page),
      });
      if (query.refundedOnly) params.set('refundedOnly', 'true');
      return requestSalesApi<OrdersResult>(withOperationalStore(`/sales-orders?${params}`, storeSlug));
    },
    refundOrder(orderId, restoreStock) {
      const path = withOperationalStore(`/sales-orders/${encodeURIComponent(orderId)}/refund`, storeSlug);
      return requestSalesApi<SalesOrder>(path, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restoreStock }),
      });
    },
  };
}
