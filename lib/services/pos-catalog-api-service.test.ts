import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPosCatalogApiService } from './pos-catalog-api-service';

const keyrings = { id: 'category-keyrings', name: '키링' };
const prints = { id: 'category-prints', name: '인쇄물' };
const first = {
  id: 'p-first', name: '포스터', imageUrl: null, category: prints, price: 5000, totalStock: 2,
  usesOptions: true, options: [{ id: 'large', name: '대형', surcharge: 1000, stock: 2 }],
};
const second = {
  id: 'p-second', name: '키링', imageUrl: '/keyring.png', category: keyrings, price: 1000,
  totalStock: 4, usesOptions: false, options: [],
};
const third = { ...second, id: 'p-third', category: null };
const exposure = {
  groups: [
    { categoryId: prints.id, name: prints.name, productIds: [first.id] },
    { categoryId: keyrings.id, name: keyrings.name, productIds: [second.id] },
    { categoryId: null, name: '', productIds: [] },
  ],
  products: [
    { ...first, isExposed: true, createdAt: '2026-11-01T00:00:00.000Z' },
    { ...second, isExposed: true, createdAt: '2026-11-02T00:00:00.000Z' },
    { ...third, isExposed: false, createdAt: '2026-11-03T00:00:00.000Z' },
  ],
};
const success = (data: unknown) => Response.json({ status: 'success', data });

afterEach(() => vi.unstubAllGlobals());

describe('POS 카탈로그 API 어댑터', () => {
  it('노출된 상품의 서버 순서와 옵션 ID·추가금·재고를 보존한다', async () => {
    const fetcher = vi.fn().mockResolvedValue(success({ categories: [prints, keyrings], products: [first, second] }));
    vi.stubGlobal('fetch', fetcher);

    const products = await createPosCatalogApiService('gallery', 'target-store').getCatalog();
    expect(products).toMatchObject([
      { id: first.id, category: '인쇄물', storeId: 'target-store', isVisible: true, stock: 2,
        options: [{ id: 'large', name: '대형', price: 1000, stock: 2 }] },
      { id: second.id, category: '키링', isVisible: true, imageUrl: '/keyring.png', options: [] },
    ]);
    expect(fetcher).toHaveBeenCalledWith('/api/v2/qrshop/pos/products?storeSlug=gallery', { credentials: 'same-origin', cache: 'no-store' });
  });

  it('노출 편집 화면의 노출 구성과 전체 상품을 한 응답에서 읽는다', async () => {
    const fetcher = vi.fn().mockResolvedValue(success(exposure));
    vi.stubGlobal('fetch', fetcher);
    const service = createPosCatalogApiService();

    const [groups, products] = await Promise.all([service.getExposure(), service.getExposureProducts()]);
    expect(groups).toEqual([
      { category: '인쇄물', hidden: false, productIds: [first.id] },
      { category: '키링', hidden: false, productIds: [second.id] },
      { category: '', hidden: false, productIds: [] },
    ]);
    expect(products[2]).toMatchObject({ id: third.id, category: '', isVisible: false, createdAt: '2026-11-03T00:00:00.000Z' });
    expect(fetcher).toHaveBeenCalledExactlyOnceWith('/api/v2/qrshop/pos/exposure', { credentials: 'same-origin', cache: 'no-store' });
  });

  it('노출 저장에 실제 카테고리 ID와 변경 순서를 보내고 숨긴 카테고리의 상품을 제외한다', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(success(exposure)).mockResolvedValueOnce(success(exposure));
    vi.stubGlobal('fetch', fetcher);
    const service = createPosCatalogApiService('gallery');
    await service.getExposure();

    await service.saveExposure([
      { category: '키링', hidden: true, productIds: [second.id] },
      { category: '인쇄물', hidden: false, productIds: [first.id] },
      { category: '', hidden: false, productIds: [third.id] },
    ]);
    expect(fetcher).toHaveBeenLastCalledWith('/api/v2/qrshop/pos/exposure?storeSlug=gallery', expect.objectContaining({
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groups: [
        { categoryId: keyrings.id, productIds: [] },
        { categoryId: prints.id, productIds: [first.id] },
        { categoryId: null, productIds: [third.id] },
      ] }),
    }));
  });

  it('알 수 없는 카테고리는 다른 카테고리나 미분류로 저장하지 않는다', async () => {
    const fetcher = vi.fn().mockResolvedValue(success(exposure));
    vi.stubGlobal('fetch', fetcher);
    const service = createPosCatalogApiService();

    await expect(service.saveExposure([{ category: '이전 카테고리', hidden: false, productIds: [first.id] }]))
      .rejects.toMatchObject({ status: 409, code: 'EXPOSURE_CHANGED' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('지정 상점의 열림 상태를 조회하고 저장 응답의 값을 사용한다', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(success({ isOpen: false })).mockResolvedValueOnce(success({ isOpen: true }));
    vi.stubGlobal('fetch', fetcher);
    const service = createPosCatalogApiService('gallery');

    await expect(service.getStoreOpen()).resolves.toBe(false);
    await expect(service.setStoreOpen(true)).resolves.toBe(true);
    expect(fetcher).toHaveBeenNthCalledWith(1, '/api/v2/qrshop/pos/store-open?storeSlug=gallery', { credentials: 'same-origin', cache: 'no-store' });
    expect(fetcher).toHaveBeenNthCalledWith(2, '/api/v2/qrshop/pos/store-open?storeSlug=gallery', expect.objectContaining({
      method: 'PATCH', body: JSON.stringify({ isOpen: true }),
    }));
  });
});
