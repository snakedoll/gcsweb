import { describe, expect, it } from 'vitest';
import { MockServiceError } from './mock-service';
import { createMockSalesManagementLandingService } from './sales-management-service';

describe('createMockSalesManagementLandingService', () => {
  it('정상 상태에서는 등록 상점 요약을 반환한다', async () => {
    const service = createMockSalesManagementLandingService();

    await expect(service.getSellerSummary()).resolves.toEqual(
      expect.objectContaining({
        store: expect.objectContaining({ name: '잇장샵' }),
        productCount: 0,
      }),
    );
  });

  it('빈 상태에서는 상점이 없는 요약을 같은 계약으로 반환한다', async () => {
    const service = createMockSalesManagementLandingService('empty');

    await expect(service.getSellerSummary()).resolves.toEqual({
      store: null,
      productCount: 0,
      orderCount: 0,
      lowStockCount: 0,
    });
  });

  it('오류 상태에서는 공통 Mock Service 오류를 반환한다', async () => {
    const service = createMockSalesManagementLandingService('error');

    await expect(service.getSellerSummary()).rejects.toBeInstanceOf(MockServiceError);
  });
});
