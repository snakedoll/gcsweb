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
    onsiteProduct: { findFirst: vi.fn(), update: vi.fn() },
    onsiteProductCategory: { findFirst: vi.fn() },
    onsiteProductOption: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

type Fn = ReturnType<typeof vi.fn>;
const context = getSellerContext as unknown as Fn;
const paidSale = hasProductPaidSale as unknown as Fn;
const product = prisma.onsiteProduct as unknown as Record<'findFirst' | 'update', Fn>;
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
  product.findFirst.mockResolvedValue({ productId: 'p1', hasOption: false, price: 1000 });
  product.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => updatedRow(data));
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
