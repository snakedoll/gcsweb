import { describe, expect, it } from 'vitest';
import { createSalesManagementMockService } from './sales-management-service';

describe('salesManagementMockService', () => {
  it('사용 가능한 상점 아이디를 확인하고 등록 결과를 돌려준다', async () => {
    const service = createSalesManagementMockService();

    await expect(service.checkStoreIdentifier('paper-shop')).resolves.toBe(true);
    await expect(
      service.saveStore({ name: '종이 상점', storeIdentifier: 'paper-shop' }),
    ).resolves.toMatchObject({
      id: 'store-paper-shop',
      name: '종이 상점',
      visitorOrderUrl: '/QRshop?store=paper-shop',
    });
  });

  it('예약된 상점 아이디는 사용할 수 없다고 알려준다', async () => {
    const service = createSalesManagementMockService();

    await expect(service.checkStoreIdentifier('taken-shop')).resolves.toBe(false);
  });
});
