import type {
  QrshopOrderDraft,
  QrshopOrderResult,
  QrshopPaymentOutcome,
  QrshopProduct,
} from '@/types/qrshop';
import type { ListResult } from './contracts';

export interface QrshopCatalogResult extends ListResult<QrshopProduct> {
  storeStatus: 'open' | 'closed';
}

export interface QrshopService {
  getCatalog(options?: { refresh?: boolean }): Promise<QrshopCatalogResult>;
  createOrder(order: QrshopOrderDraft): Promise<QrshopOrderResult>;
  getOrder(orderId: string): Promise<QrshopOrderResult>;
  processPayment(
    orderId: string,
    outcome: QrshopPaymentOutcome,
  ): Promise<QrshopOrderResult>;
}
