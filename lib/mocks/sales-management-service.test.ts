import { describe, expect, it } from 'vitest';
import { createSalesManagementMockService } from './sales-management-service';

describe('SalesManagementMockService', () => {
  it('상점 식별자를 포함한 상품을 저장하고 목록에서 반환한다', async () => {
    const service = createSalesManagementMockService();
    const store = await service.getStore();
    const product = await service.saveProduct({ storeId: store!.id, name: '손목시계', category: '시계', usesOptions: false, options: [], price: 30000, stock: 20 });
    expect(product.storeId).toBe(store!.id);
    await expect(service.getProducts()).resolves.toMatchObject({ total: 1, items: [expect.objectContaining({ name: '손목시계' })] });
  });
});
