// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/db';
import { hasProductPaidSale } from '@/lib/qrshop/sales-history';
import { getSellerContext } from '@/lib/seller/store';
import { PATCH } from './[onsiteProductId]/route';

vi.mock('@/lib/seller/store', () => ({ getSellerContext: vi.fn() }));
vi.mock('@/lib/qrshop/sales-history', () => ({ hasProductPaidSale: vi.fn() }));
vi.mock('@/lib/db', () => ({
  prisma: {
    onsiteProduct: { findFirst: vi.fn(), update: vi.fn(), aggregate: vi.fn() },
    onsiteProductCategory: { findFirst: vi.fn() },
    onsiteProductOption: { deleteMany: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

type Fn = ReturnType<typeof vi.fn>;
const context = getSellerContext as unknown as Fn;
const paidSale = hasProductPaidSale as unknown as Fn;
const product = prisma.onsiteProduct as unknown as Record<'findFirst' | 'update' | 'aggregate', Fn>;
const category = prisma.onsiteProductCategory as unknown as Record<'findFirst', Fn>;
const option = prisma.onsiteProductOption as unknown as Record<'deleteMany' | 'findMany' | 'update', Fn>;
const transaction = prisma.$transaction as unknown as Fn;

const STORE = { storeId: 's1', name: '상점', storeSlug: 'shop', imageUrl: null };
const updatedRow = (over: Record<string, unknown> = {}) => ({
  productId: 'p1',
  name: '엽서',
  imageUrl: null,
  price: 1000,
  initStock: 5,
  currentStock: 5,
  hasOption: false,
  createdAt: new Date('2026-10-01T00:00:00Z'),
  category: null,
  options: [],
  ...over,
});

const patch = (body: unknown) =>
  PATCH(new Request('http://localhost/api', { method: 'PATCH', body: JSON.stringify(body) }), {
    params: { onsiteProductId: 'p1' },
  });

beforeEach(() => {
  vi.resetAllMocks();
  context.mockResolvedValue({ ok: true, userId: 'u1', store: STORE });
  product.findFirst.mockResolvedValue({ productId: 'p1', hasOption: false, price: 1000, categoryId: 'c1' });
  // data.options 는 { create: [...] } 모양이라 응답 행에는 넣지 않는다.
  product.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
    updatedRow({ ...data, options: [] }),
  );
  transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));
  paidSale.mockResolvedValue(false);
});

describe('PATCH /api/v2/qrshop/products/{onsiteProductId} 가격 잠금 (1106 기획회의)', () => {
  it('판매 이력이 있는 상품의 가격을 바꾸면 409 PRODUCT_PRICE_LOCKED 이고 아무것도 바꾸지 않는다', async () => {
    paidSale.mockResolvedValue(true);
    const res = await patch({ name: '엽서 세트', price: 800 });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: 'PRODUCT_PRICE_LOCKED', message: '판매 이력이 있는 상품의 가격 변경 불가' });
    expect(product.update).not.toHaveBeenCalled();
  });

  it('판매 이력 확인은 수정과 같은 트랜잭션 안에서 한다', async () => {
    paidSale.mockResolvedValue(true);
    await patch({ price: 800 });
    expect(transaction).toHaveBeenCalled();
    expect(paidSale).toHaveBeenCalledWith('p1', prisma);
  });

  it('판매 이력이 있어도 가격이 그대로면 나머지를 수정한다', async () => {
    paidSale.mockResolvedValue(true);
    const res = await patch({ name: '엽서 세트', price: 1000 });
    expect(res.status).toBe(200);
    expect(product.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: '엽서 세트', price: 1000 }) }),
    );
  });

  it('판매 이력이 있어도 가격을 보내지 않은 수정(이름·재고)은 된다', async () => {
    paidSale.mockResolvedValue(true);
    const res = await patch({ name: '엽서 세트', totalStock: 3 });
    expect(res.status).toBe(200);
    expect(product.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.not.objectContaining({ price: expect.anything() }) }),
    );
  });

  it('판매 이력이 없으면 가격을 바꿀 수 있다', async () => {
    const res = await patch({ price: 800 });
    expect(res.status).toBe(200);
    expect(product.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ price: 800 }) }));
    expect((await res.json()).data.product).toMatchObject({ price: 800, hasSalesHistory: false });
  });
});

describe('PATCH /api/v2/qrshop/products/{onsiteProductId} 옵션 잠금 (#57 기획 답)', () => {
  const RED = { optionId: 'o1', name: '빨강', surcharge: 500 };
  const BLUE = { optionId: 'o2', name: '파랑', surcharge: 0 };

  beforeEach(() => {
    product.findFirst.mockResolvedValue({ productId: 'p1', hasOption: true, price: 1000 });
    option.findMany.mockResolvedValue([RED, BLUE]);
    option.update.mockResolvedValue({});
    option.deleteMany.mockResolvedValue({ count: 0 });
  });

  const noWrites = () => {
    expect(product.update).not.toHaveBeenCalled();
    expect(option.update).not.toHaveBeenCalled();
    expect(option.deleteMany).not.toHaveBeenCalled();
  };

  it('판매 이력이 있는 상품의 옵션 추가금을 바꾸면 409 PRODUCT_PRICE_LOCKED', async () => {
    paidSale.mockResolvedValue(true);
    const res = await patch({
      options: [
        { id: 'o1', name: '빨강', surcharge: 700, stock: 1 },
        { id: 'o2', name: '파랑', surcharge: 0, stock: 1 },
      ],
    });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: 'PRODUCT_PRICE_LOCKED' });
    noWrites();
  });

  it('판매 이력이 있는 상품의 옵션을 빼면 409 PRODUCT_OPTION_DELETE_LOCKED', async () => {
    paidSale.mockResolvedValue(true);
    const res = await patch({ options: [{ id: 'o1', name: '빨강', surcharge: 500, stock: 1 }] });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({
      code: 'PRODUCT_OPTION_DELETE_LOCKED',
      message: '판매 이력이 있는 상품의 옵션 삭제 불가',
    });
    noWrites();
  });

  it('판매 이력이 있는 상품의 옵션 사용을 끄면(옵션 전부 삭제) 409 PRODUCT_OPTION_DELETE_LOCKED', async () => {
    paidSale.mockResolvedValue(true);
    const res = await patch({ hasOption: false, totalStock: 3, options: [] });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: 'PRODUCT_OPTION_DELETE_LOCKED' });
    noWrites();
  });

  it('판매 이력이 있어도 옵션 이름 변경(id)과 옵션 추가는 되고, 기존 옵션 id를 유지한다', async () => {
    paidSale.mockResolvedValue(true);
    const res = await patch({
      options: [
        { id: 'o1', name: '주홍', surcharge: 500, stock: 2 },
        { id: 'o2', name: '파랑', surcharge: 0, stock: 3 },
        { name: '초록', surcharge: 300, stock: 4 },
      ],
    });
    expect(res.status).toBe(200);
    expect(option.deleteMany).not.toHaveBeenCalled();
    expect(option.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { optionId: 'o2' }, data: expect.objectContaining({ name: '파랑', currentStock: 3 }) }),
    );
    expect(option.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { optionId: 'o1' }, data: expect.objectContaining({ name: '주홍', currentStock: 2 }) }),
    );
    const data = product.update.mock.calls[0][0].data;
    expect(data.options).toEqual({ create: [{ name: '초록', surcharge: 300, initStock: 4, currentStock: 4 }] });
    expect(data).toMatchObject({ initStock: 9, currentStock: 9 });
  });

  it('id 없이 같은 이름으로 보내면(지금 프론트) 기존 옵션 재고만 고치고 지우지 않는다', async () => {
    paidSale.mockResolvedValue(true);
    const res = await patch({
      options: [
        { name: '빨강', surcharge: 500, stock: 7 },
        { name: '파랑', surcharge: 0, stock: 0 },
      ],
    });
    expect(res.status).toBe(200);
    expect(option.deleteMany).not.toHaveBeenCalled();
    expect(option.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { optionId: 'o1' }, data: expect.objectContaining({ currentStock: 7 }) }),
    );
    expect(product.update.mock.calls[0][0].data.options).toBeUndefined();
  });

  it('판매 이력이 없으면 옵션을 지울 수 있다(빠진 옵션만 지운다)', async () => {
    const res = await patch({ options: [{ id: 'o1', name: '빨강', surcharge: 800, stock: 1 }] });
    expect(res.status).toBe(200);
    expect(option.deleteMany).toHaveBeenCalledWith({ where: { productId: 'p1', optionId: { in: ['o2'] } } });
    expect(option.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { optionId: 'o1' }, data: expect.objectContaining({ surcharge: 800 }) }),
    );
  });

  it('두 옵션 이름을 맞바꾸면 임시 이름을 거쳐 바꾼다(이름 unique 충돌 방지)', async () => {
    const res = await patch({
      options: [
        { id: 'o1', name: '파랑', surcharge: 500, stock: 1 },
        { id: 'o2', name: '빨강', surcharge: 0, stock: 1 },
      ],
    });
    expect(res.status).toBe(200);
    const names = option.update.mock.calls.map(([arg]) => [arg.where.optionId, arg.data.name]);
    expect(names).toHaveLength(4);
    const temps = names.slice(0, 2).map(([, name]) => name);
    expect(temps.every((name) => !['빨강', '파랑'].includes(name))).toBe(true);
    expect(new Set(temps).size).toBe(2);
    expect(names.slice(2)).toEqual([
      ['o1', '파랑'],
      ['o2', '빨강'],
    ]);
  });

  it('이 상품 옵션이 아닌 id를 보내면 404', async () => {
    const res = await patch({ options: [{ id: 'zz', name: '빨강', surcharge: 500, stock: 1 }] });
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ message: '옵션을 찾을 수 없습니다.' });
    noWrites();
  });

  it('같은 옵션 id를 두 번 보내면 400', async () => {
    const res = await patch({
      options: [
        { id: 'o1', name: '빨강', surcharge: 500, stock: 1 },
        { id: 'o1', name: '주홍', surcharge: 500, stock: 1 },
      ],
    });
    expect(res.status).toBe(400);
    noWrites();
  });

  it('기존 옵션은 트랜잭션 안에서 읽는다', async () => {
    await patch({ options: [{ id: 'o1', name: '빨강', surcharge: 500, stock: 1 }] });
    expect(option.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { productId: 'p1' } }));
    expect(transaction).toHaveBeenCalled();
  });
});

describe('PATCH /api/v2/qrshop/products/{onsiteProductId} 카테고리 변경과 노출 순서 (#59)', () => {
  it('다른 카테고리로 옮기면 그 카테고리 노출 순서의 맨 뒤에 둔다', async () => {
    category.findFirst.mockResolvedValue({ categoryId: 'c2' });
    product.aggregate.mockResolvedValue({ _max: { exposureOrder: 4 } });
    const res = await patch({ categoryId: 'c2' });
    expect(res.status).toBe(200);
    expect(product.aggregate).toHaveBeenCalledWith(expect.objectContaining({ where: { storeId: 's1', categoryId: 'c2' } }));
    expect(product.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ categoryId: 'c2', exposureOrder: 5 }) }),
    );
  });

  it('카테고리를 떼면 미분류의 맨 뒤에 둔다', async () => {
    product.aggregate.mockResolvedValue({ _max: { exposureOrder: null } });
    await patch({ categoryId: null });
    expect(product.aggregate).toHaveBeenCalledWith(expect.objectContaining({ where: { storeId: 's1', categoryId: null } }));
    expect(product.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ categoryId: null, exposureOrder: 1 }) }),
    );
  });

  it('같은 카테고리를 다시 보내거나 카테고리를 보내지 않으면 순서를 그대로 둔다', async () => {
    category.findFirst.mockResolvedValue({ categoryId: 'c1' });
    await patch({ categoryId: 'c1', name: '엽서 세트' });
    await patch({ name: '엽서 세트' });
    expect(product.aggregate).not.toHaveBeenCalled();
    expect(product.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.not.objectContaining({ exposureOrder: expect.anything() }) }),
    );
  });
});
