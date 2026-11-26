import type {
  ProductAnalyticsDateRange, ProductAnalyticsEvent, ProductAnalyticsEventDraft, ProductAnalyticsGroup, ProductAnalyticsReport,
} from '@/types/product-analytics';

export interface ProductAnalyticsService {
  listEvents(): ProductAnalyticsEvent[];
  addEvent(draft: ProductAnalyticsEventDraft): ProductAnalyticsEvent;
  getReport(range: ProductAnalyticsDateRange, group: ProductAnalyticsGroup): ProductAnalyticsReport;
}

export function getAnalyticsDayButtons({ startDate, endDate }: ProductAnalyticsDateRange) {
  const date = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (end.getTime() - date.getTime() >= 31 * 86_400_000) return [];
  const days: string[] = [];
  while (date <= end) {
    days.push(date.toISOString().slice(0, 10));
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return days;
}
