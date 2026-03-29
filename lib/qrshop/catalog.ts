import { z } from 'zod';
import rawCatalog from '@/app/QRshop/item.json';

const QrShopItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  option: z.string().optional(),
  price: z.number().int().nonnegative().max(50_000_000),
  /** 최초 DB 시드 시 재고. 운영 재고는 FairShopProductTable.stock */
  initStock: z.number().int().min(0).max(1_000_000),
  /** 참고용(파일 기입). 실제 표시·결제 재고는 DB 기준 */
  currentStock: z.number().int().min(0).max(1_000_000).optional(),
  emoji: z.string().optional(),
  disabled: z.boolean().optional(),
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

export type QrShopOrderLineInput = { itemId: string; quantity: number };

const MAX_LINES = 40;
const MAX_QTY_PER_LINE = 99;
const MAX_ORDER_TOTAL = 2_000_000;

export type ResolvedQrLine = {
  itemId: string;
  quantity: number;
  unitPrice: number;
  displayLabel: string;
};

export function resolveQrShopOrderLines(
  lines: QrShopOrderLineInput[],
): { ok: true; resolved: ResolvedQrLine[]; paymentAmount: number } | { ok: false; message: string } {
  if (!lines.length || lines.length > MAX_LINES) {
    return { ok: false, message: '주문 품목 수가 올바르지 않습니다.' };
  }

  const merged = new Map<string, number>();
  for (const row of lines) {
    const id = row.itemId?.trim() ?? '';
    const qty = Math.floor(Number(row.quantity));
    if (!id || !Number.isFinite(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) {
      return { ok: false, message: '수량이 올바르지 않습니다.' };
    }
    merged.set(id, (merged.get(id) ?? 0) + qty);
  }

  const resolved: ResolvedQrLine[] = [];
  let paymentAmount = 0;

  for (const [itemId, quantity] of merged.entries()) {
    const meta = getQrShopItemById(itemId);
    if (!meta) {
      return { ok: false, message: '판매하지 않는 상품이 포함되어 있습니다.' };
    }
    paymentAmount += meta.price * quantity;
    resolved.push({
      itemId,
      quantity,
      unitPrice: meta.price,
      displayLabel: meta.option ? `${meta.name} (${meta.option})` : meta.name,
    });
  }

  if (paymentAmount > MAX_ORDER_TOTAL) {
    return { ok: false, message: '결제 한도를 초과했습니다.' };
  }

  return { ok: true, resolved, paymentAmount };
}
