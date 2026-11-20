import { describe, expect, it, vi } from 'vitest';
import {
  buildExposureGroups,
  findVisitorOrderBlock,
  isExposureInputValid,
  nextCategoryOrder,
  nextProductOrder,
  saveExposure,
  sortByCategoryOrder,
  toPosCatalog,
  upsertCategoryAtEnd,
} from './pos-exposure';

type Any = any;

const row = (productId: string, categoryId: string | null, isExposed = true) => ({
  productId,
  name: `상품 ${productId}`,
  imageUrl: null,
  price: 1000,
  currentStock: 5,
  hasOption: false,
  isExposed,
  createdAt: new Date('2026-11-01T00:00:00Z'),
  categoryId,
  category: categoryId ? { categoryId, name: `카테고리 ${categoryId}` } : null,
  options: [],
});

describe('맨 뒤 번호', () => {
  it('카테고리: 지금 가장 큰 번호 + 1, 없으면 1', async () => {
    const tx = { onsiteProductCategory: { aggregate: vi.fn().mockResolvedValue({ _max: { exposureOrder: 4 } }) } } as Any;
    expect(await nextCategoryOrder(tx, 's1')).toBe(5);
    expect(tx.onsiteProductCategory.aggregate).toHaveBeenCalledWith({ where: { storeId: 's1' }, _max: { exposureOrder: true } });
    tx.onsiteProductCategory.aggregate.mockResolvedValue({ _max: { exposureOrder: null } });
    expect(await nextCategoryOrder(tx, 's1')).toBe(1);
  });

  it('상품: 같은 카테고리(미분류는 null) 안에서 가장 큰 번호 + 1', async () => {
    const tx = { onsiteProduct: { aggregate: vi.fn().mockResolvedValue({ _max: { exposureOrder: 2 } }) } } as Any;
    expect(await nextProductOrder(tx, 's1', null)).toBe(3);
    expect(tx.onsiteProduct.aggregate).toHaveBeenCalledWith({
      where: { storeId: 's1', categoryId: null },
      _max: { exposureOrder: true },
    });
  });

  it('있는 카테고리 이름이면 그대로 쓰고 번호를 새로 매기지 않는다', async () => {
    const tx = {
      onsiteProductCategory: {
        findUnique: vi.fn().mockResolvedValue({ categoryId: 'c1', name: '키링' }),
        aggregate: vi.fn(),
        upsert: vi.fn(),
      },
    } as Any;
    expect(await upsertCategoryAtEnd(tx, 's1', '키링')).toEqual({ categoryId: 'c1', name: '키링' });
    expect(tx.onsiteProductCategory.upsert).not.toHaveBeenCalled();
  });

  it('새 카테고리 이름이면 맨 뒤 번호로 만든다', async () => {
    const tx = {
      onsiteProductCategory: {
        findUnique: vi.fn().mockResolvedValue(null),
        aggregate: vi.fn().mockResolvedValue({ _max: { exposureOrder: 2 } }),
        upsert: vi.fn().mockResolvedValue({ categoryId: 'c9', name: '엽서' }),
      },
    } as Any;
    await upsertCategoryAtEnd(tx, 's1', '엽서');
    expect(tx.onsiteProductCategory.upsert.mock.calls[0][0].create).toEqual({ storeId: 's1', name: '엽서', exposureOrder: 3 });
  });
});

describe('정렬·묶음', () => {
  it('카테고리 순서 → 받은 순서, 미분류·모르는 카테고리는 맨 뒤', () => {
    const items = [{ id: 'u', categoryId: null }, { id: 'a1', categoryId: 'a' }, { id: 'b1', categoryId: 'b' }, { id: 'a2', categoryId: 'a' }];
    expect(sortByCategoryOrder(items, ['b', 'a']).map((item) => item.id)).toEqual(['b1', 'a1', 'a2', 'u']);
  });

  it('묶음: 카테고리 순서대로, 노출 상품만, 마지막은 미분류', () => {
    const groups = buildExposureGroups(
      [{ categoryId: 'a', name: '키링' }, { categoryId: 'b', name: '엽서' }],
      [
        { productId: 'p1', categoryId: 'a', isExposed: true },
        { productId: 'p2', categoryId: 'a', isExposed: false },
        { productId: 'p3', categoryId: null, isExposed: true },
      ],
    );
    expect(groups).toEqual([
      { categoryId: 'a', name: '키링', productIds: ['p1'] },
      { categoryId: 'b', name: '엽서', productIds: [] },
      { categoryId: null, name: '', productIds: ['p3'] },
    ]);
  });

  it('포스 목록: 노출 상품과 노출 상품이 있는 카테고리만', () => {
    const catalog = toPosCatalog({
      categories: [{ categoryId: 'a', name: '키링' }, { categoryId: 'b', name: '엽서' }],
      products: [row('p1', 'a'), row('p2', 'b', false), row('p3', null)],
    });
    expect(catalog.categories).toEqual([{ id: 'a', name: '키링' }]);
    expect(catalog.products.map((product) => product.id)).toEqual(['p1', 'p3']);
    expect(catalog.products[0]).toEqual({
      id: 'p1', name: '상품 p1', imageUrl: null, category: { id: 'a', name: '카테고리 a' },
      price: 1000, totalStock: 5, usesOptions: false, options: [],
    });
  });
});

describe('저장 구성 검증', () => {
  const categories = [{ categoryId: 'a' }, { categoryId: 'b' }];
  const products = [
    { productId: 'p1', categoryId: 'a' },
    { productId: 'p2', categoryId: 'b' },
    { productId: 'p3', categoryId: null },
  ];
  const valid = (groups: { categoryId: string | null; productIds: string[] }[]) =>
    isExposureInputValid(groups, categories, products);

  it('카테고리를 빠짐없이 한 번씩, 상품은 자기 카테고리에 한 번씩이면 통과(미분류 묶음은 생략 가능)', () => {
    expect(valid([{ categoryId: 'b', productIds: ['p2'] }, { categoryId: 'a', productIds: [] }])).toBe(true);
    expect(valid([{ categoryId: 'a', productIds: ['p1'] }, { categoryId: 'b', productIds: [] }, { categoryId: null, productIds: ['p3'] }])).toBe(true);
  });

  it.each([
    ['카테고리 누락', [{ categoryId: 'a', productIds: [] }]],
    ['카테고리 중복', [{ categoryId: 'a', productIds: [] }, { categoryId: 'a', productIds: [] }, { categoryId: 'b', productIds: [] }]],
    ['없는 카테고리', [{ categoryId: 'a', productIds: [] }, { categoryId: 'b', productIds: [] }, { categoryId: 'z', productIds: [] }]],
    ['없는 상품', [{ categoryId: 'a', productIds: ['p9'] }, { categoryId: 'b', productIds: [] }]],
    ['다른 카테고리 상품', [{ categoryId: 'a', productIds: ['p2'] }, { categoryId: 'b', productIds: [] }]],
    ['상품 중복', [{ categoryId: 'a', productIds: ['p1', 'p1'] }, { categoryId: 'b', productIds: [] }]],
    ['미분류 상품을 카테고리에', [{ categoryId: 'a', productIds: ['p3'] }, { categoryId: 'b', productIds: [] }]],
  ])('%s면 실패', (_name, groups) => {
    expect(valid(groups)).toBe(false);
  });
});

describe('저장', () => {
  it('카테고리 순서 1부터, 목록 상품은 노출+순서, 나머지는 미노출', async () => {
    const tx = {
      onsiteProductCategory: { update: vi.fn() },
      onsiteProduct: { update: vi.fn(), updateMany: vi.fn() },
    } as Any;
    await saveExposure(tx, 's1', [
      { categoryId: 'b', productIds: ['p2', 'p4'] },
      { categoryId: 'a', productIds: [] },
      { categoryId: null, productIds: ['p3'] },
    ]);
    expect(tx.onsiteProductCategory.update.mock.calls.map((call: Any) => call[0])).toEqual([
      { where: { categoryId: 'b' }, data: { exposureOrder: 1 } },
      { where: { categoryId: 'a' }, data: { exposureOrder: 2 } },
    ]);
    expect(tx.onsiteProduct.updateMany).toHaveBeenCalledWith({
      where: { storeId: 's1', productId: { notIn: ['p2', 'p4', 'p3'] } },
      data: { isExposed: false },
    });
    expect(tx.onsiteProduct.update.mock.calls.map((call: Any) => call[0])).toEqual([
      { where: { productId: 'p2' }, data: { isExposed: true, exposureOrder: 1 } },
      { where: { productId: 'p4' }, data: { isExposed: true, exposureOrder: 2 } },
      { where: { productId: 'p3' }, data: { isExposed: true, exposureOrder: 1 } },
    ]);
  });
});

describe('방문객 주문 차단', () => {
  const db = (store: unknown, hidden = 0) =>
    ({
      store: { findUnique: vi.fn().mockResolvedValue(store) },
      onsiteProduct: { count: vi.fn().mockResolvedValue(hidden) },
    }) as Any;

  it('없는 상점은 판정하지 않는다(주문 검증 몫)', async () => {
    expect(await findVisitorOrderBlock(db(null), 'shop1', ['p1'])).toBeNull();
  });

  it('닫힌 상점이면 STORE_CLOSED', async () => {
    expect(await findVisitorOrderBlock(db({ storeId: 's1', isOpen: false }), 'shop1', ['p1'])).toBe('STORE_CLOSED');
  });

  it('미노출 상품이 하나라도 있으면 PRODUCT_NOT_FOUND', async () => {
    const client = db({ storeId: 's1', isOpen: true }, 1);
    expect(await findVisitorOrderBlock(client, 'shop1', ['p1', 'p2'])).toBe('PRODUCT_NOT_FOUND');
    expect(client.onsiteProduct.count).toHaveBeenCalledWith({
      where: { storeId: 's1', productId: { in: ['p1', 'p2'] }, isExposed: false },
    });
  });

  it('열려 있고 모두 노출이면 null', async () => {
    expect(await findVisitorOrderBlock(db({ storeId: 's1', isOpen: true }, 0), 'shop1', ['p1'])).toBeNull();
  });
});
