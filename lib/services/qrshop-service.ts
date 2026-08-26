import type {
  QrshopOrderDraft,
  QrshopOrderResult,
  QrshopPaymentOutcome,
  QrshopProduct,
} from '@/types/qrshop';
import type { ListResult } from './contracts';

export interface QrshopService {
  getCatalog(): Promise<ListResult<QrshopProduct>>;
  createOrder(order: QrshopOrderDraft): Promise<QrshopOrderResult>;
  getOrder(orderId: string): Promise<QrshopOrderResult>;
  processPayment(
    orderId: string,
    outcome: QrshopPaymentOutcome,
  ): Promise<QrshopOrderResult>;
}
