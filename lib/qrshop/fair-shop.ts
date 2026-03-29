import type { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { getQrShopCatalog } from '@/lib/qrshop/catalog';
import type { ResolvedQrLine } from '@/lib/qrshop/catalog';

/**
 * item.json 기준으로 FairShopProduct 행이 없으면 생성한다. 기존 행의 stock 은 유지한다.
 */
export async function ensureFairShopProductsSeeded(client: Pick<PrismaClient, 'fairShopProduct'>): Promise<void> {
  const catalog = getQrShopCatalog();
  for (const item of catalog.items) {
    await client.fairShopProduct.upsert({
      where: { qrItemId: item.id },
      create: {
        qrItemId: item.id,
        initStock: item.initStock,
        stock: item.initStock,
      },
      update: {},
    });
  }
}

export async function loadFairShopStockMap(
  client: Pick<PrismaClient, 'fairShopProduct'>,
  qrItemIds: string[],
): Promise<Map<string, number>> {
  const uniq = [...new Set(qrItemIds)];
  const rows = await client.fairShopProduct.findMany({
    where: { qrItemId: { in: uniq } },
    select: { qrItemId: true, stock: true },
  });
  return new Map(rows.map((r) => [r.qrItemId, r.stock]));
}

export function assertFairShopStockForLines(
  resolved: ResolvedQrLine[],
  stockMap: Map<string, number>,
): { ok: true } | { ok: false; message: string; outOfStockLabels: string[] } {
  const outOfStockLabels: string[] = [];
  for (const row of resolved) {
    const s = stockMap.get(row.itemId);
    if (s === undefined || s < row.quantity) {
      outOfStockLabels.push(row.displayLabel);
    }
  }
  if (outOfStockLabels.length === 0) return { ok: true };
  const hasMissing = resolved.some((row) => stockMap.get(row.itemId) === undefined);
  return {
    ok: false,
    message: hasMissing
      ? '재고 정보를 찾을 수 없는 상품이 있습니다.'
      : '재고가 부족한 상품이 포함되어 있습니다.',
    outOfStockLabels,
  };
}

export function linesSnapshotFromResolved(resolved: ResolvedQrLine[]): Prisma.JsonArray {
  return resolved.map((row) => ({
    itemId: row.itemId,
    label: row.displayLabel,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
  })) as unknown as Prisma.JsonArray;
}

type Tx = {
  fairShopProduct: PrismaClient['fairShopProduct'];
  fairShopHistory: PrismaClient['fairShopHistory'];
};

export async function fairShopDecrementStockAndWriteHistory(
  tx: Tx,
  params: {
    orderId: string;
    paymentMethod: number;
    paymentAmount: number;
    resolved: ResolvedQrLine[];
  },
): Promise<void> {
  for (const row of params.resolved) {
    const updated = await tx.fairShopProduct.updateMany({
      where: { qrItemId: row.itemId, stock: { gte: row.quantity } },
      data: { stock: { decrement: row.quantity } },
    });
    if (updated.count !== 1) {
      throw new Error('FAIR_SHOP_STOCK_UNDERFLOW');
    }
  }

  await tx.fairShopHistory.create({
    data: {
      orderId: params.orderId,
      paymentMethod: params.paymentMethod,
      paymentAmount: params.paymentAmount,
      linesSnapshot: linesSnapshotFromResolved(params.resolved),
    },
  });
}

export type QrOrderItemRow = { quantity: number; optionData: unknown };

export function tryParseQrDeductionsFromOrderItems(
  items: QrOrderItemRow[],
): { qrItemId: string; quantity: number }[] | null {
  const out: { qrItemId: string; quantity: number }[] = [];
  for (const item of items) {
    const od = item.optionData;
    if (!od || typeof od !== 'object' || Array.isArray(od)) return null;
    const rec = od as { source?: string; qrItemId?: string };
    if (rec.source !== 'qrshop') return null;
    const id = typeof rec.qrItemId === 'string' ? rec.qrItemId.trim() : '';
    if (!id) return null;
    out.push({ qrItemId: id, quantity: Math.max(1, Math.floor(Number(item.quantity))) });
  }
  return out.length > 0 ? out : null;
}

export async function fairShopDecrementFromOrderItems(
  tx: Tx,
  deductions: { qrItemId: string; quantity: number }[],
): Promise<void> {
  const merged = new Map<string, number>();
  for (const row of deductions) {
    merged.set(row.qrItemId, (merged.get(row.qrItemId) ?? 0) + row.quantity);
  }
  for (const [qrItemId, quantity] of merged.entries()) {
    const updated = await tx.fairShopProduct.updateMany({
      where: { qrItemId, stock: { gte: quantity } },
      data: { stock: { decrement: quantity } },
    });
    if (updated.count !== 1) {
      throw new Error('FAIR_SHOP_STOCK_UNDERFLOW');
    }
  }
}
