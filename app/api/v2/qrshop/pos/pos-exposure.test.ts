// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/db';
import { getStoreAccess } from '@/lib/qrshop/store-access';
import { GET as getProducts } from './products/route';
import { GET as getExposure, PUT as putExposure } from './exposure/route';
import { GET as getOpen, PATCH as patchOpen } from './store-open/route';

vi.mock('@/lib/qrshop/store-access', () => ({ getStoreAccess: vi.fn() }));
vi.mock('@/lib/db', () => ({
  prisma: {
    store: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
    onsiteProductCategory: { findMany: vi.fn(), update: vi.fn() },
    onsiteProduct: { findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
}));

type Fn = ReturnType<typeof vi.fn>;
const access = getStoreAccess as unknown as Fn;
const db = prisma as unknown as {
  store: Record<'findUniqueOrThrow' | 'update', Fn>;
  onsiteProductCategory: Record<'findMany' | 'update', Fn>;
  onsiteProduct: Record<'findMany' | 'update' | 'updateMany', Fn>;
  $queryRaw: Fn;
  $transaction: Fn;
};

const STORE = { storeId: 's1', name: '잇장샵', storeSlug: 'itjang', createdAt: new Date() };
const STAFF_STORE = { storeId: 's2', name: '그림상점', storeSlug: 'gallery', createdAt: new Date() };
const asOwner = () => access.mockResolvedValue({ ok: true, userId: 'u1', access: { role: 'OWNER', store: STORE } });
const asStaff = () => access.mockResolvedValue({ ok: true, userId: 'u2', access: { role: 'STAFF', store: STAFF_STORE } });

const product = (productId: string, categoryId: string | null, isExposed = true) => ({
  productId,
  name: `상품 ${productId}`,
  imageUrl: null,
  price: 1000,
  currentStock: 3,
  hasOption: false,
  isExposed,
  createdAt: new Date('2026-11-01T00:00:00Z'),
  categoryId,
  category: categoryId ? { categoryId, name: '키링' } : null,
  options: [],
});

const CATEGORIES = [{ categoryId: 'c1', name: '키링' }];
const PRODUCTS = [product('p1', 'c1'), product('p2', 'c1', false), product('p3', null)];

const url = (storeSlug?: string) => `http://localhost/api${storeSlug ? `?storeSlug=${storeSlug}` : ''}`;
const query = (storeSlug?: string) => new Request(url(storeSlug));
const body = (method: string, payload: unknown, storeSlug?: string) =>
  new Request(url(storeSlug), { method, body: typeof payload === 'string' ? payload : JSON.stringify(payload) });

beforeEach(() => {
  vi.resetAllMocks();
  asOwner();
  db.onsiteProductCategory.findMany.mockImplementation(({ select }: { select: Record<string, boolean> }) =>
    Promise.resolve(select.name ? CATEGORIES : CATEGORIES.map(({ categoryId }) => ({ categoryId }))),
  );
  db.onsiteProduct.findMany.mockImplementation(({ select }: { select: Record<string, unknown> }) =>
    Promise.resolve(select.name ? PRODUCTS : PRODUCTS.map(({ productId, categoryId }) => ({ productId, categoryId }))),
  );
  db.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));
});

describe('권한', () => {
  it.each([
    ['상품 목록', () => getProducts(query('gallery'))],
    ['노출 조회', () => getExposure(query('gallery'))],
    ['열림 조회', () => getOpen(query('gallery'))],
    ['노출 저장', () => putExposure(body('PUT', { groups: [{ categoryId: 'c1', productIds: [] }] }, 'gallery'))],
    ['열림 변경', () => patchOpen(body('PATCH', { isOpen: true }, 'gallery'))],
  ])('%s: 비로그인 401, 지정 상점에 접근할 수 없으면 404', async (_name, call) => {
    access.mockResolvedValue({ ok: false, reason: 'UNAUTHORIZED' });
    expect((await call()).status).toBe(401);
    access.mockResolvedValue({ ok: true, userId: 'u9', access: null });
    expect((await call()).status).toBe(404);
    expect(access).toHaveBeenNthCalledWith(1, 'gallery');
    expect(access).toHaveBeenNthCalledWith(2, 'gallery');
    expect(db.onsiteProduct.findMany).not.toHaveBeenCalled();
    expect(db.store.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(db.store.update).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('승인 직원은 지정 상점의 상품과 노출 구성을 조회하고 저장할 수 있다', async () => {
    asStaff();
    expect((await getProducts(query('gallery'))).status).toBe(200);
    expect((await getExposure(query('gallery'))).status).toBe(200);
    expect((await putExposure(body('PUT', { groups: [{ categoryId: 'c1', productIds: [] }] }, 'gallery'))).status).toBe(200);
    expect(access.mock.calls).toEqual([['gallery'], ['gallery'], ['gallery']]);
    expect(db.onsiteProduct.findMany.mock.calls.every(([args]) => args.where.storeId === 's2')).toBe(true);
    expect(db.onsiteProduct.updateMany).toHaveBeenCalledWith({
      where: { storeId: 's2', productId: { notIn: [] } }, data: { isExposed: false },
    });
  });

  it('승인 직원은 지정 상점의 열림 상태를 조회하고 변경할 수 있다', async () => {
    asStaff();
    db.store.findUniqueOrThrow.mockResolvedValue({ isOpen: false });
    db.store.update.mockResolvedValue({ isOpen: true });
    expect((await (await getOpen(query('gallery'))).json()).data).toEqual({ isOpen: false });
    expect((await (await patchOpen(body('PATCH', { isOpen: true }, 'gallery'))).json()).data).toEqual({ isOpen: true });
    expect(access.mock.calls).toEqual([['gallery'], ['gallery']]);
    expect(db.store.findUniqueOrThrow).toHaveBeenCalledWith({ where: { storeId: 's2' }, select: { isOpen: true } });
    expect(db.store.update).toHaveBeenCalledWith({ where: { storeId: 's2' }, data: { isOpen: true }, select: { isOpen: true } });
  });
});

describe('GET /pos/products', () => {
  it('노출 상품과 노출 상품이 있는 카테고리만, 상점 기준으로 조회', async () => {
    const res = await getProducts(query());
    const { data } = await res.json();
    expect(data.categories).toEqual([{ id: 'c1', name: '키링' }]);
    expect(data.products.map((p: { id: string }) => p.id)).toEqual(['p1', 'p3']);
    expect(access).toHaveBeenCalledWith(null);
    expect(db.onsiteProduct.findMany.mock.calls[0][0].where).toEqual({ storeId: 's1' });
  });
});

describe('GET /pos/exposure', () => {
  it('카테고리별 노출 묶음(미분류 맨 뒤)과 전체 상품(isExposed·createdAt 포함)', async () => {
    const { data } = await (await getExposure(query())).json();
    expect(data.groups).toEqual([
      { categoryId: 'c1', name: '키링', productIds: ['p1'] },
      { categoryId: null, name: '', productIds: ['p3'] },
    ]);
    expect(data.products.map((p: { id: string; isExposed: boolean }) => [p.id, p.isExposed])).toEqual([
      ['p1', true],
      ['p2', false],
      ['p3', true],
    ]);
    expect(data.products[0].createdAt).toBe('2026-11-01T00:00:00.000Z');
  });
});

describe('PUT /pos/exposure', () => {
  it('형식이 틀리면 400', async () => {
    expect((await putExposure(body('PUT', '{'))).status).toBe(400);
    expect((await putExposure(body('PUT', { groups: [{ categoryId: 'c1' }] }))).status).toBe(400);
  });

  it('구성이 지금 상품과 맞지 않으면 409 EXPOSURE_CHANGED, 저장하지 않는다', async () => {
    const res = await putExposure(body('PUT', { groups: [{ categoryId: 'c1', productIds: ['p3'] }] }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ status: 'error', code: 'EXPOSURE_CHANGED', message: '상품 목록 변경됨' });
    expect(db.onsiteProduct.updateMany).not.toHaveBeenCalled();
  });

  it('저장하고 저장 뒤 구성을 돌려준다', async () => {
    const res = await putExposure(body('PUT', { groups: [{ categoryId: 'c1', productIds: ['p2', 'p1'] }, { categoryId: null, productIds: [] }] }));
    expect(res.status).toBe(200);
    expect(db.$queryRaw).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('FOR NO KEY UPDATE')]), 's1');
    expect(db.$queryRaw).toHaveBeenCalledBefore(db.onsiteProductCategory.findMany);
    expect(db.onsiteProductCategory.update).toHaveBeenCalledWith({ where: { categoryId: 'c1' }, data: { exposureOrder: 1 } });
    expect(db.onsiteProduct.updateMany).toHaveBeenCalledWith({
      where: { storeId: 's1', productId: { notIn: ['p2', 'p1'] } },
      data: { isExposed: false },
    });
    expect(db.onsiteProduct.update).toHaveBeenCalledWith({ where: { productId: 'p2' }, data: { isExposed: true, exposureOrder: 1 } });
    expect((await res.json()).data.groups).toBeDefined();
  });
});

describe('/pos/store-open', () => {
  it('GET: 상점 열림 여부', async () => {
    db.store.findUniqueOrThrow.mockResolvedValue({ isOpen: false });
    expect((await (await getOpen(query())).json()).data).toEqual({ isOpen: false });
    expect(db.store.findUniqueOrThrow).toHaveBeenCalledWith({ where: { storeId: 's1' }, select: { isOpen: true } });
  });

  it('PATCH: 형식이 틀리면 400', async () => {
    expect((await patchOpen(body('PATCH', { isOpen: 'yes' }))).status).toBe(400);
    expect(db.store.update).not.toHaveBeenCalled();
  });

  it('PATCH: 소유자가 열고 닫는다', async () => {
    db.store.update.mockResolvedValue({ isOpen: true });
    const res = await patchOpen(body('PATCH', { isOpen: true }));
    expect((await res.json()).data).toEqual({ isOpen: true });
    expect(db.store.update).toHaveBeenCalledWith({ where: { storeId: 's1' }, data: { isOpen: true }, select: { isOpen: true } });
  });
});
