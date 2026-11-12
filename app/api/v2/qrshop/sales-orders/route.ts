import { apiErrors, apiSuccess } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { getStoreAccess } from '@/lib/qrshop/store-access';
import { storeErrors } from '@/lib/qrshop/store-api';
import {
  SALES_ORDER_SELECT,
  SALES_ORDERS_PAGE_SIZE,
  kstDateString,
  matchesSalesOrderSearch,
  parseSalesOrdersQuery,
  salesOrdersWhere,
  toSalesOrderView,
} from '@/lib/qrshop/sales-orders';

/**
 * GET /api/v2/qrshop/sales-orders?date=YYYY-MM-DD&channel=all|online|onsite&q=&page=
 * 전체 주문 조회. 선택한 날짜(KST)의 결제완료·환불 주문을 최신순으로 30건씩.
 * 상점 소유자와 승인된 직원.
 */
export async function GET(request: Request) {
  try {
    const ctx = await getStoreAccess();
    if (!ctx.ok) return apiErrors.unauthorized();
    if (!ctx.access) return storeErrors.notFound();

    const query = parseSalesOrdersQuery(new URL(request.url).searchParams);
    if (!query.ok) return apiErrors.invalidInput('유효하지 않은 조회 조건');

    const { store } = ctx.access;
    const { timeKey, channel, search, page } = query.value;

    // 하루 한 상점의 주문은 많지 않아 한 번에 읽고, 검색(주문번호 3자리 포함 여부)과 페이지는 메모리에서 처리한다.
    const rows = await prisma.order.findMany({
      where: salesOrdersWhere(store.storeId, timeKey, channel),
      select: SALES_ORDER_SELECT,
      orderBy: [{ orderDate: 'desc' }, { id: 'desc' }],
    });

    const orders = rows.map(toSalesOrderView).filter((order) => matchesSalesOrderSearch(order, search));
    const start = (page - 1) * SALES_ORDERS_PAGE_SIZE;

    return apiSuccess({
      orders: orders.slice(start, start + SALES_ORDERS_PAGE_SIZE),
      total: orders.length,
      page,
      pageSize: SALES_ORDERS_PAGE_SIZE,
      // 날짜 이동 범위: 상점 개설일 ~ 오늘(KST)
      openedOn: kstDateString(store.createdAt),
      today: kstDateString(),
    });
  } catch (error) {
    console.error('[GET /api/v2/qrshop/sales-orders]', error);
    return apiErrors.serverError();
  }
}
