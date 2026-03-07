import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type) {
      const terms = await prisma.term.findMany({
        where: { type },
        orderBy: { order: 'asc' },
      });
      return NextResponse.json({ status: 'success', data: terms });
    }

    const allTerms = await prisma.term.findMany({
      orderBy: [{ type: 'asc' }, { order: 'asc' }],
    });
    return NextResponse.json({ status: 'success', data: allTerms });
  } catch (error) {
    console.error('Terms GET error:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to fetch terms' }, { status: 500 });
  }
}
