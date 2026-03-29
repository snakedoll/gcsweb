import { z } from 'zod';
import rawCatalog from '@/app/QRshop/item.json';

const QrShopItemSchema = z.object({
  id: z.string().min(1),
  /** 쇼핑 DB에 등록된 Buy Now·현장수령 상품 ID (Prisma Product.id) */
  productId: z.string().min(1),
  name: z.string().min(1),
  option: z.string().optional(),
  /** 화면 표시용. 실제 결제 금액은 DB 상품·옵션 가격 기준 */
  price: z.number().int().nonnegative().max(50_000_000),
  emoji: z.string().optional(),
  disabled: z.boolean().optional(),
  /** 옵션 상품이면 Buynow 주문과 동일한 형태로 지정 */
  optionData: z.unknown().optional().nullable(),
});

const CatalogSchema = z.object({
  items: z.array(QrShopItemSchema),
});

export type QrShopCatalogItem = z.infer<typeof QrShopItemSchema>;

export type QrShopCatalog = {
  items: QrShopCatalogItem[];
};

function loadCatalog(): QrShopCatalog {
  const parsed = CatalogSchema.safeParse(rawCatalog);
  if (!parsed.success) {
    throw new Error(`QRshop item.json invalid: ${parsed.error.message}`);
  }
  const ids = parsed.data.items.map((row) => row.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error('QRshop item.json: duplicate item id');
  }
  return parsed.data;
}

let cached: QrShopCatalog | null = null;

export function getQrShopCatalog(): QrShopCatalog {
  if (!cached) cached = loadCatalog();
  return cached;
}

export function getQrShopItemById(id: string): QrShopCatalogItem | undefined {
  return getQrShopCatalog().items.find((row) => row.id === id && !row.disabled);
}

export function listQrShopItemsForDisplay(): QrShopCatalogItem[] {
  return getQrShopCatalog().items.filter((row) => !row.disabled);
}
