import type { ProductAnalyticsService } from '@/lib/services/product-analytics-service';
import type { ProductAnalyticsBundle, ProductAnalyticsEvent, ProductAnalyticsGroup, ProductAnalyticsRow } from '@/types/product-analytics';

const sampleEvent: ProductAnalyticsEvent = {
  id: 'sample-flea-market', name: '2026 플리마켓', startDate: '2026-10-08', endDate: '2026-10-11',
};

interface Sale {
  product: string;
  option: string;
  category: string;
  netUnitPrice: number;
  discount: number;
  quantities: [number, number, number, number];
}

const sales: Sale[] = [
  { product: '엽서 세트', option: '일러스트 A', category: '문구', netUnitPrice: 6000, discount: 8000, quantities: [7, 5, 9, 6] },
  { product: '반다나', option: '네이비', category: '패션 잡화', netUnitPrice: 13000, discount: 12000, quantities: [6, 5, 8, 3] },
  { product: '반다나', option: '베이지', category: '패션 잡화', netUnitPrice: 10000, discount: 0, quantities: [0, 1, 1, 0] },
  { product: '에코백', option: '내추럴', category: '패션 잡화', netUnitPrice: 18000, discount: 18000, quantities: [4, 6, 3, 6] },
  { product: '머그컵', option: '아이보리', category: '생활 소품', netUnitPrice: 15000, discount: 0, quantities: [5, 4, 4, 5] },
  { product: '코스터 세트', option: '기본', category: '생활 소품', netUnitPrice: 9000, discount: 6000, quantities: [3, 5, 3, 3] },
  { product: '키링', option: '별 모양', category: '패션 잡화', netUnitPrice: 8000, discount: 4000, quantities: [4, 5, 1, 4] },
  { product: '스티커 팩', option: '기본', category: '문구', netUnitPrice: 4000, discount: 0, quantities: [4, 4, 3, 2] },
  { product: '노트', option: '무지', category: '문구', netUnitPrice: 7000, discount: 2000, quantities: [3, 5, 2, 2] },
  { product: '포스터', option: 'A3', category: '인쇄물', netUnitPrice: 10000, discount: 0, quantities: [2, 1, 2, 2] },
  { product: '핀버튼', option: '기본', category: '패션 잡화', netUnitPrice: 3000, discount: 0, quantities: [1, 2, 1, 2] },
  { product: '패브릭 포스터', option: '기본', category: '인쇄물', netUnitPrice: 26000, discount: 0, quantities: [0, 2, 1, 1] },
  { product: '미니 프린트', option: '기본', category: '인쇄물', netUnitPrice: 13000, discount: 0, quantities: [0, 0, 1, 1] },
];

interface Bundle {
  names: ProductAnalyticsBundle['names'];
  counts: [number, number, number, number];
}

const bundles: Bundle[] = [
  { names: ['엽서 세트', '키링'], counts: [1, 2, 0, 1] },
  { names: ['반다나', '엽서 세트'], counts: [1, 1, 1, 0] },
  { names: ['반다나', '키링'], counts: [0, 1, 1, 1] },
  { names: ['엽서 세트', '노트'], counts: [0, 1, 0, 1] },
  { names: ['머그컵', '코스터 세트'], counts: [1, 1, 0, 0] },
  { names: ['코스터 세트', '노트'], counts: [0, 1, 1, 0] },
  { names: ['반다나', '에코백'], counts: [0, 0, 1, 1] },
  { names: ['에코백', '포스터'], counts: [1, 0, 0, 1] },
  { names: ['반다나', '코스터 세트'], counts: [1, 0, 1, 0] },
  { names: ['에코백', '엽서 세트'], counts: [0, 2, 0, 0] },
];

const salesDays = ['2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'];

function groupName(sale: Sale, group: ProductAnalyticsGroup) {
  if (group === 'option') return `${sale.product} · ${sale.option}`;
  return sale[group];
}

export function createMockProductAnalyticsService(): ProductAnalyticsService {
  const events = [sampleEvent];
  return {
    listEvents: () => events.map(event => ({ ...event })),
    addEvent(draft) {
      const event = { ...draft, id: `event-${events.length}` };
      events.push(event);
      return { ...event };
    },
    getReport({ startDate, endDate }, group) {
      const includesDay = salesDays.map(day => startDate <= day && day <= endDate);
      const byName = new Map<string, Omit<ProductAnalyticsRow, 'share'>>();
      for (const sale of sales) {
        const quantity = sale.quantities.reduce((sum, count, index) => sum + (includesDay[index] ? count : 0), 0);
        if (!quantity) continue;
        const name = groupName(sale, group);
        const row = byName.get(name) ?? { name, quantity: 0, netSales: 0, discount: 0 };
        const totalQuantity = sale.quantities.reduce((sum, count) => sum + count, 0);
        // Assign each day's share of the fixture discount so day totals reconcile with the event total.
        let sold = 0;
        const discount = sale.quantities.reduce((sum, count, index) => {
          const previousDiscount = Math.round(sold * sale.discount / totalQuantity);
          sold += count;
          return sum + (includesDay[index] ? Math.round(sold * sale.discount / totalQuantity) - previousDiscount : 0);
        }, 0);
        row.quantity += quantity;
        row.netSales += quantity * sale.netUnitPrice;
        row.discount += discount;
        byName.set(name, row);
      }
      const rows = [...byName.values()].sort((a, b) => b.quantity - a.quantity || b.netSales - a.netSales);
      const totalSales = rows.reduce((sum, row) => sum + row.netSales, 0);
      const popular = bundles.map(({ names, counts }) => ({
        names,
        orders: counts.reduce((sum, count, index) => sum + (includesDay[index] ? count : 0), 0),
      })).filter(bundle => bundle.orders > 0).sort((a, b) => b.orders - a.orders).slice(0, 10);
      return {
        rows: rows.map(row => ({ ...row, share: totalSales ? row.netSales * 100 / totalSales : 0 })),
        bundles: popular.map(bundle => ({ ...bundle, rank: popular.findIndex(candidate => candidate.orders === bundle.orders) + 1 })),
      };
    },
  };
}
