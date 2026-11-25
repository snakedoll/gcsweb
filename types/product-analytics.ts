export type ProductAnalyticsGroup = 'product' | 'option' | 'category';

export interface ProductAnalyticsDateRange {
  startDate: string;
  endDate: string;
}

export interface ProductAnalyticsEventDraft extends ProductAnalyticsDateRange {
  name: string;
}

export interface ProductAnalyticsEvent extends ProductAnalyticsEventDraft {
  id: string;
}

export interface ProductAnalyticsRow {
  name: string;
  quantity: number;
  netSales: number;
  discount: number;
  share: number;
}

export interface ProductAnalyticsBundle {
  names: [string, string];
  orders: number;
  rank: number;
}

export interface ProductAnalyticsReport {
  rows: ProductAnalyticsRow[];
  bundles: ProductAnalyticsBundle[];
}
