import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return jsonError(403, 'FORBIDDEN', '권한이 없습니다.');

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    // fetch Buy Now products (type === 1)
    const products = await prisma.product.findMany({
      where: {
        type: 1, // Buy Now
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
        ],
      },
      include: {
        variants: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const mapped = products.map((p) => ({
      id: p.id,
      name: p.name,
      // Sum up stock from variants if stock exists, or use a default if null
      stock: p.variants.reduce((acc: number, v: any) => acc + (v.stock ?? 0), 0),
      // We can also return variants for detailed view
      variantCount: p.variants.length,
      price: p.price,
    }));

    return NextResponse.json({
      status: 'success',
      data: mapped,
    });
  } catch (err) {
    console.error('[Admin Onsite Inventory GET Error]', err);
    return jsonError(500, 'INTERNAL_SERVER_ERROR', '서버 내부 오류가 발생했습니다.');
  }
}
