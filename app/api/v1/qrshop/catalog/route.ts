import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ensureFairShopProductsSeeded } from '@/lib/qrshop/fair-shop';
import { getQrShopCatalog } from '@/lib/qrshop/catalog';
import { apiError as jsonError } from '@/lib/api-response';

/** QR 메뉴(공개 정보만). 재고는 응답에 포함하지 않는다. */
export async function GET() {
  try {
    await ensureFairShopProductsSeeded(prisma);
    const catalog = getQrShopCatalog();
    const items = catalog.items
      .filter((row) => !row.disabled)
      .map((row) => ({
        id: row.id,
        name: row.name,
        option: row.option,
        price: row.price,
        emoji: row.emoji,
      }));

    return NextResponse.json({ status: 'success', data: { items } });
  } catch (error) {
    console.error('Fair shop catalog GET error:', error);
    return jsonError(500, 'SERVER_ERROR', 'server internal error.');
  }
}
