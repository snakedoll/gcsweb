import { ORDERS_PAGE_SIZE, orderItemsText, seoulOrderDate, type OrdersService, type SalesOrder } from '@/lib/services/orders-service';

export const MOCK_STORE_OPENED_AT = '2025-03-12T00:00:00+09:00';

// Independent examples: these are never derived from live orders or Mock POS sales.
export function createMockOrdersService(seed?: SalesOrder[]): OrdersService {
  const today = seoulOrderDate();
  const yesterday = seoulOrderDate(new Date(Date.now() - 86_400_000));
  const orders: SalesOrder[] = structuredClone(seed ?? [
    { id: 'mock-order-3', orderNo: '003', orderedAt: `${today}T20:52:00+09:00`, items: [{ productName: '부산 엽서', optionName: null, quantity: 1 }], paymentMethod: 'online', paymentAmount: 3000, refundStatus: 'none' },
    { id: 'mock-order-2', orderNo: '002', orderedAt: `${today}T20:51:00+09:00`, items: [{ productName: '고양이 키링', optionName: 'BLACK', quantity: 2 }], paymentMethod: 'card', paymentAmount: 10000, refundStatus: 'pending' },
    { id: 'mock-order-1', orderNo: '001', orderedAt: `${today}T20:50:00+09:00`, items: [{ productName: '전주 엽서', optionName: null, quantity: 1 }], paymentMethod: 'cash', paymentAmount: 3000, refundStatus: 'refunded' },
    ...Array.from({ length: 95 }, (_, index): SalesOrder => ({
      id: `mock-previous-order-${index + 1}`,
      orderNo: String(index + 1).padStart(3, '0'),
      orderedAt: `${yesterday}T20:00:00+09:00`,
      items: index === 94 ? [
        { productName: '가죽 노트', optionName: '큰 사이즈 가로 줄 노트', quantity: 1 },
        { productName: '재생지 스케치북 세트', optionName: '두꺼운 미색 종이와 표지', quantity: 2 },
        { productName: '한정판 손바느질 파우치', optionName: '연한 청록색 체크무늬', quantity: 1 },
      ] : [{ productName: '가죽 노트', optionName: null, quantity: 1 }],
      paymentMethod: index % 2 === 0 ? 'card' : 'online',
      paymentAmount: 3000,
      refundStatus: index === 94 || index % 4 === 0 ? 'refunded' : 'none',
      ...(index === 94 && { refundReason: 'sold-out' }),
    })),
  ]);
  return {
    async refundOrder(orderId, restoreStock) {
      const order = orders.find(order => order.id === orderId);
      if (!order) throw new Error('주문을 찾을 수 없습니다.');
      if (order.refundStatus !== 'none') throw new Error('이미 환불 처리된 주문입니다.');
      // Record only the example result; never touch product stock, POS sales or payments.
      order.refundStatus = 'refunded';
      order.refundRestoreStock = restoreStock;
      return structuredClone(order);
    },
    async listOrders(query) {
      const search = query.search.trim().toLocaleLowerCase('ko-KR');
      const filtered = orders.filter(order => seoulOrderDate(new Date(order.orderedAt)) === query.date
        && (query.channel === 'all' || (query.channel === 'online' ? order.paymentMethod === 'online' : order.paymentMethod !== 'online'))
        && (!query.refundedOnly || order.refundStatus === 'refunded')
        && (!search || order.orderNo.toLowerCase().includes(search) || orderItemsText(order).toLocaleLowerCase('ko-KR').includes(search)))
        .sort((a, b) => Date.parse(b.orderedAt) - Date.parse(a.orderedAt) || b.orderNo.localeCompare(a.orderNo));
      const total = filtered.length;
      const page = Math.min(Math.max(1, Math.floor(query.page) || 1), Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE)));
      return structuredClone({ orders: filtered.slice((page - 1) * ORDERS_PAGE_SIZE, page * ORDERS_PAGE_SIZE), total, page });
    },
  };
}
