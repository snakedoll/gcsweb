import { resolveMockScenario, type MockScenario } from '@/lib/mocks/mock-service';
import type { SalesManagementLandingService } from '@/lib/services/sales-management-service';
import type { SellerSummary } from '@/types/sales-management';

export type SalesManagementLandingMockState =
  | 'success'
  | 'empty'
  | 'error'
  | 'loading';

const registeredSellerSummary: SellerSummary = {
  store: {
    id: 'store-itjang',
    name: '잇장샵',
    description: 'ygygygy23233',
  },
  productCount: 0,
  orderCount: 12,
  lowStockCount: 2,
};

const emptySellerSummary: SellerSummary = {
  store: null,
  productCount: 0,
  orderCount: 0,
  lowStockCount: 0,
};

function getScenario(
  state: SalesManagementLandingMockState,
): MockScenario<SellerSummary> {
  switch (state) {
    case 'empty':
      return { kind: 'empty', data: emptySellerSummary };
    case 'error':
      return {
        kind: 'error',
        message: '판매 관리 정보를 불러오지 못했습니다.',
      };
    case 'loading':
      return { kind: 'success', data: registeredSellerSummary, delayMs: 1200 };
    default:
      return { kind: 'success', data: registeredSellerSummary };
  }
}

export function createMockSalesManagementLandingService(
  state: SalesManagementLandingMockState = 'success',
): SalesManagementLandingService {
  return {
    getSellerSummary: () => resolveMockScenario(getScenario(state)),
  };
}
