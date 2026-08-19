import type { SalesManagementService } from '@/lib/services/sales-management-service';
import type { SalesStore, StoreFormInput } from '@/types/sales-management';
import { MockServiceError, resolveMockScenario } from './mock-service';

const unavailableStoreIdentifiers = new Set(['gcs', 'admin', 'taken-shop']);

function normaliseStoreIdentifier(value: string) {
  return value.trim().toLowerCase();
}

export function createSalesManagementMockService(): SalesManagementService {
  let registeredStore: SalesStore | null = null;

  return {
    async getStore() {
      return resolveMockScenario({ kind: 'success', data: registeredStore });
    },

    async checkStoreIdentifier(storeIdentifier) {
      const identifier = normaliseStoreIdentifier(storeIdentifier);

      if (identifier === 'error-shop') {
        throw new MockServiceError('아이디 확인 중 일시적인 오류가 발생했습니다.');
      }

      return resolveMockScenario({
        kind: 'success',
        data: !unavailableStoreIdentifiers.has(identifier),
      });
    },

    async saveStore(input: StoreFormInput) {
      const storeIdentifier = normaliseStoreIdentifier(input.storeIdentifier);

      if (storeIdentifier === 'error-shop') {
        throw new MockServiceError('상점 등록 중 일시적인 오류가 발생했습니다. 다시 시도해주세요.');
      }

      if (unavailableStoreIdentifiers.has(storeIdentifier)) {
        throw new MockServiceError('이미 사용 중인 상점 아이디입니다.');
      }

      registeredStore = {
        id: `store-${storeIdentifier}`,
        name: input.name.trim(),
        storeIdentifier,
        visitorOrderUrl: `/QRshop?store=${encodeURIComponent(storeIdentifier)}`,
      };

      return resolveMockScenario({ kind: 'success', data: registeredStore });
    },

    async getProducts() {
      return resolveMockScenario({ kind: 'empty', data: { items: [], total: 0 } });
    },

    async saveProduct(product) {
      return resolveMockScenario({ kind: 'success', data: { ...product, id: 'product-mock' } });
    },

    async getOrders() {
      return resolveMockScenario({ kind: 'empty', data: { items: [], total: 0 } });
    },

    async getInventory() {
      return resolveMockScenario({ kind: 'empty', data: { items: [], total: 0 } });
    },
  };
}

export const salesManagementMockService = createSalesManagementMockService();
