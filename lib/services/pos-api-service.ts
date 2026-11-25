import {
  posLineKey, PosStockChangedError, type PosCartLine, type PosPaymentMethod,
  type PosReceipt, type PosService, type PosUnavailableItem,
} from './pos-service';
import { createPosCatalogApiService } from './pos-catalog-api-service';
import { requestSalesApi, StoreApiError, withOperationalStore } from './sales-management-api-client';

export function createPosApiService(storeSlug?: string, storeId?: string): PosService {
  const requests = new Map<string, string>();

  async function completeSale(lines: PosCartLine[], paymentMethod: PosPaymentMethod) {
    if (lines.some(line => Boolean(line.discountAmount))) {
      throw new Error('할인이 적용된 장바구니는 현재 현장 결제에 등록할 수 없어요.');
    }
    const items = lines.map(line => ({
      productId: line.productId, optionId: line.optionId ?? null, quantity: line.quantity,
    }));
    const signature = JSON.stringify([paymentMethod, items.map(item => JSON.stringify(item)).sort()]);
    const clientRequestId = requests.get(signature) ?? crypto.randomUUID();
    requests.set(signature, clientRequestId);
    try {
      const receipt = await requestSalesApi<PosReceipt>(withOperationalStore('/pos/orders', storeSlug), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientRequestId, items, paymentMethod }),
      });
      if (!receipt?.orderId || !receipt.orderCode) {
        throw new Error('주문번호를 확인하지 못했어요. 같은 결제 내역으로 다시 확인해주세요.');
      }
      requests.delete(signature);
      return receipt;
    } catch (error) {
      if (error instanceof StoreApiError && error.status === 409 && error.code === 'SOLD_OUT') {
        requests.delete(signature);
        const data = error.data as { soldOutItems?: PosUnavailableItem[] } | undefined;
        const unavailable = data?.soldOutItems;
        if (Array.isArray(unavailable) && unavailable.length) {
          throw new PosStockChangedError(
            unavailable.flatMap(item => item.productId
              ? [posLineKey({ productId: item.productId, optionId: item.optionId ?? undefined })] : []),
            unavailable,
          );
        }
      }
      if (error instanceof StoreApiError && error.code === 'REQUEST_ID_CONFLICT') requests.delete(signature);
      // A missing response can still mean the order committed. Reusing the same key retrieves that receipt.
      throw error;
    }
  }

  return {
    dataSource: 'api',
    ...createPosCatalogApiService(storeSlug, storeId),
    completeSale,
    async getReceipts() {
      throw new Error('주문서 보드 연동은 준비 중이에요.');
    },
  };
}
