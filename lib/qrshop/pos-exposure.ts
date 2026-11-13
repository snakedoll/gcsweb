import type { Prisma } from '@prisma/client';

/**
 * 현장 포스 노출 편집(카테고리·상품 순서, 노출 여부). 포스 상품 목록과 QR샵 상품 조회가 같은 순서를 쓴다.
 *
 * 순서: exposureOrder 오름차순, 같으면 등록순(createdAt, id). 새 카테고리·상품은 맨 뒤 번호를 받는다.
 * 카테고리가 없는 상품(미분류)은 항상 맨 뒤 묶음이다.
 */

type Tx = Pick<Prisma.TransactionClient, 'onsiteProductCategory' | 'onsiteProduct'>;

export const CATEGORY_EXPOSURE_ORDER = [
  { exposureOrder: 'asc' },
  { createdAt: 'asc' },
  { categoryId: 'asc' },
] satisfies Prisma.OnsiteProductCategoryOrderByWithRelationInput[];

export const PRODUCT_EXPOSURE_ORDER = [
  { exposureOrder: 'asc' },
  { createdAt: 'asc' },
  { productId: 'asc' },
] satisfies Prisma.OnsiteProductOrderByWithRelationInput[];

/** 상점 카테고리 순서의 맨 뒤 번호. */
export async function nextCategoryOrder(tx: Tx, storeId: string): Promise<number> {
  const { _max } = await tx.onsiteProductCategory.aggregate({ where: { storeId }, _max: { exposureOrder: true } });
  return (_max.exposureOrder ?? 0) + 1;
}

/** 그 카테고리(null=미분류) 상품 순서의 맨 뒤 번호. */
export async function nextProductOrder(tx: Tx, storeId: string, categoryId: string | null): Promise<number> {
  const { _max } = await tx.onsiteProduct.aggregate({ where: { storeId, categoryId }, _max: { exposureOrder: true } });
  return (_max.exposureOrder ?? 0) + 1;
}

/** 이름으로 카테고리를 찾고, 없으면 맨 뒤 순서로 만든다(상점 안 이름은 unique). */
export async function upsertCategoryAtEnd(tx: Tx, storeId: string, name: string) {
  const existing = await tx.onsiteProductCategory.findUnique({
    where: { storeId_name: { storeId, name } },
    select: { categoryId: true, name: true },
  });
  if (existing) return existing;
  return tx.onsiteProductCategory.upsert({
    where: { storeId_name: { storeId, name } },
    create: { storeId, name, exposureOrder: await nextCategoryOrder(tx, storeId) },
    update: {},
    select: { categoryId: true, name: true },
  });
}

/** 순서대로 받은 카테고리 기준으로 상품을 카테고리 순 → 상품 순으로 다시 늘어놓는다. 미분류는 맨 뒤. */
export function sortByCategoryOrder<T extends { categoryId: string | null }>(
  products: T[],
  orderedCategoryIds: string[],
): T[] {
  const rank = new Map(orderedCategoryIds.map((id, index) => [id, index]));
  const rankOf = (product: T) =>
    product.categoryId === null ? orderedCategoryIds.length : (rank.get(product.categoryId) ?? orderedCategoryIds.length);
  return products
    .map((product, index) => ({ product, index }))
    .sort((a, b) => rankOf(a.product) - rankOf(b.product) || a.index - b.index)
    .map(({ product }) => product);
}

export type ExposureGroupInput = { categoryId: string | null; productIds: string[] };

export type ExposureCategory = { categoryId: string; name: string };
export type ExposureProduct = { productId: string; categoryId: string | null; isExposed: boolean };

/** 카테고리별 노출 상품 목록. 카테고리는 순서대로, 미분류(categoryId null)는 맨 뒤. */
export function buildExposureGroups(categories: ExposureCategory[], products: ExposureProduct[]) {
  return [...categories, { categoryId: null, name: '' }].map((category) => ({
    categoryId: category.categoryId,
    name: category.name,
    productIds: products
      .filter((product) => product.isExposed && product.categoryId === category.categoryId)
      .map((product) => product.productId),
  }));
}

/**
 * 저장할 노출 구성이 지금 상점 상품과 맞는지 본다.
 * - 카테고리는 상점 카테고리를 빠짐없이 한 번씩, 미분류(null) 묶음은 있어도 되고 없어도 된다.
 * - 상품은 한 번씩, 그 상품의 지금 카테고리 묶음에만 올 수 있다.
 * 맞지 않으면 편집하는 동안 상품·카테고리가 바뀐 것이다.
 */
export function isExposureInputValid(
  groups: ExposureGroupInput[],
  categories: { categoryId: string }[],
  products: { productId: string; categoryId: string | null }[],
): boolean {
  const categoryIds = groups.map((group) => group.categoryId);
  const named = categoryIds.filter((id): id is string => id !== null);
  if (new Set(categoryIds).size !== categoryIds.length) return false;
  if (named.length !== categories.length || !categories.every((category) => named.includes(category.categoryId))) {
    return false;
  }

  const categoryOf = new Map(products.map((product) => [product.productId, product.categoryId]));
  const seen = new Set<string>();
  for (const group of groups) {
    for (const productId of group.productIds) {
      if (seen.has(productId) || !categoryOf.has(productId) || categoryOf.get(productId) !== group.categoryId) {
        return false;
      }
      seen.add(productId);
    }
  }
  return true;
}

const POS_PRODUCT_SELECT = {
  productId: true,
  name: true,
  imageUrl: true,
  price: true,
  currentStock: true,
  hasOption: true,
  isExposed: true,
  createdAt: true,
  categoryId: true,
  category: { select: { categoryId: true, name: true } },
  options: {
    select: { optionId: true, name: true, surcharge: true, currentStock: true },
    orderBy: [{ createdAt: 'asc' }, { optionId: 'asc' }],
  },
} satisfies Prisma.OnsiteProductSelect;

type PosProductRow = Prisma.OnsiteProductGetPayload<{ select: typeof POS_PRODUCT_SELECT }>;

/** 응답 모양은 「상품 관리_상품 조회」와 같다(hasSalesHistory·createdAt 제외). */
export function toPosProduct(product: PosProductRow) {
  return {
    id: product.productId,
    name: product.name,
    imageUrl: product.imageUrl,
    category: product.category ? { id: product.category.categoryId, name: product.category.name } : null,
    price: product.price,
    totalStock: product.currentStock,
    usesOptions: product.hasOption,
    options: product.options.map((option) => ({
      id: option.optionId,
      name: option.name,
      surcharge: option.surcharge,
      stock: option.currentStock,
    })),
  };
}

type LoadDb = Pick<Prisma.TransactionClient, 'onsiteProductCategory' | 'onsiteProduct'>;

/** 상점의 카테고리(순서대로)와 상품(카테고리 순서 → 상품 순서, 미분류 맨 뒤). */
export async function loadStoreExposure(db: LoadDb, storeId: string) {
  const [categories, rows] = await Promise.all([
    db.onsiteProductCategory.findMany({
      where: { storeId },
      select: { categoryId: true, name: true },
      orderBy: CATEGORY_EXPOSURE_ORDER,
    }),
    db.onsiteProduct.findMany({ where: { storeId }, select: POS_PRODUCT_SELECT, orderBy: PRODUCT_EXPOSURE_ORDER }),
  ]);
  const products = sortByCategoryOrder(rows, categories.map((category) => category.categoryId));
  return { categories, products };
}

/** 현장 포스 상품 그리드: 노출 상품과, 노출 상품이 있는 카테고리. */
export function toPosCatalog({ categories, products }: Awaited<ReturnType<typeof loadStoreExposure>>) {
  const exposed = products.filter((product) => product.isExposed);
  const used = new Set(exposed.map((product) => product.categoryId));
  return {
    categories: categories
      .filter((category) => used.has(category.categoryId))
      .map((category) => ({ id: category.categoryId, name: category.name })),
    products: exposed.map(toPosProduct),
  };
}

/** 노출 편집 화면: 카테고리별 노출 상품 묶음과 전체 상품. */
export function toExposureView({ categories, products }: Awaited<ReturnType<typeof loadStoreExposure>>) {
  return {
    groups: buildExposureGroups(categories, products),
    products: products.map((product) => ({
      ...toPosProduct(product),
      isExposed: product.isExposed,
      createdAt: product.createdAt.toISOString(),
    })),
  };
}

/**
 * 방문객 주문을 막는 사유. 닫힌 상점이면 STORE_CLOSED, 미노출 상품이 있으면 PRODUCT_NOT_FOUND(삭제된 상품과 같게).
 * 없는 상점·상품은 여기서 판정하지 않는다(주문 검증이 한다). 현장 포스 결제에는 쓰지 않는다.
 */
export async function findVisitorOrderBlock(
  db: Pick<Prisma.TransactionClient, 'store' | 'onsiteProduct'>,
  storeSlug: string,
  productIds: string[],
): Promise<'STORE_CLOSED' | 'PRODUCT_NOT_FOUND' | null> {
  const store = await db.store.findUnique({ where: { storeSlug }, select: { storeId: true, isOpen: true } });
  if (!store) return null;
  if (!store.isOpen) return 'STORE_CLOSED';
  const hidden = await db.onsiteProduct.count({
    where: { storeId: store.storeId, productId: { in: productIds }, isExposed: false },
  });
  return hidden > 0 ? 'PRODUCT_NOT_FOUND' : null;
}

/** 노출 구성을 통째로 저장한다. 목록에 없는 상품은 미노출이 된다(순서는 그대로 둔다). */
export async function saveExposure(tx: Tx, storeId: string, groups: ExposureGroupInput[]): Promise<void> {
  const named = groups.filter((group): group is ExposureGroupInput & { categoryId: string } => group.categoryId !== null);
  for (const [index, group] of named.entries()) {
    await tx.onsiteProductCategory.update({ where: { categoryId: group.categoryId }, data: { exposureOrder: index + 1 } });
  }

  const exposedIds = groups.flatMap((group) => group.productIds);
  await tx.onsiteProduct.updateMany({
    where: { storeId, productId: { notIn: exposedIds } },
    data: { isExposed: false },
  });
  for (const group of groups) {
    for (const [index, productId] of group.productIds.entries()) {
      await tx.onsiteProduct.update({ where: { productId }, data: { isExposed: true, exposureOrder: index + 1 } });
    }
  }
}
