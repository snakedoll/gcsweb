import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { loadFairShopStockMap, ensureFairShopProductsSeeded } from '@/lib/qrshop/fair-shop';
import { getQrShopCatalog } from '@/lib/qrshop/catalog';

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

/** QR 메뉴 + DB 재고(stock) 합쳐서 반환 */
export async function GET() {
  try {
    await ensureFairShopProductsSeeded(prisma);
    const catalog = getQrShopCatalog();
    const ids = catalog.items.map((row) => row.id);
    const stockMap = await loadFairShopStockMap(prisma, ids);

    const items = catalog.items
      .filter((row) => !row.disabled)
      .map((row) => ({
        id: row.id,
        name: row.name,
        option: row.option,
        price: row.price,
        emoji: row.emoji,
        initStock: row.initStock,
        currentStock: stockMap.get(row.id) ?? 0,
        stock: stockMap.get(row.id) ?? 0,
      }));

    return NextResponse.json({ status: 'success', data: { items } });
  } catch (error) {
    console.error('Fair shop catalog GET error:', error);
    return jsonError(500, 'SERVER_ERROR', 'server internal error.');
  }
}
