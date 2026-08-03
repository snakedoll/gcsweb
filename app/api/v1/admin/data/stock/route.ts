import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import { apiError as jsonError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const products = await prisma.fairShopProduct.findMany({
      select: {
        qrItemId: true,
        initStock: true,
        stock: true,
        currentStock: true,
      },
      orderBy: {
        qrItemId: 'asc',
      },
    });

    const rows = products.map((row) => {
      const initStock = Number(row.initStock ?? 0);
      const stock = Number(row.stock ?? 0);
      const currentStock = Number(row.currentStock ?? 0);

      return {
        qrItemId: row.qrItemId,
        initStock,
        stock,
        initStockMinusStock: initStock - stock,
        currentStock,
      };
    });

    return NextResponse.json({
      status: 'success',
      data: {
        rows,
      },
    });
  } catch (error) {
    console.error('[Admin Onsite Data Stock GET Error]', error);
    return jsonError(500, 'SERVER_ERROR', '서버 오류가 발생했습니다.');
  }
}
