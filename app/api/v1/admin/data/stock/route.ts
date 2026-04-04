import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      if (auth.reason === 'UNAUTHORIZED') {
        return jsonError(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
      }
      return jsonError(403, 'FORBIDDEN', '관리자 권한이 필요합니다.');
    }

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
