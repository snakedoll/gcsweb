import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const termDelegate = (prisma as unknown as { term?: { findMany: (args?: unknown) => Promise<unknown> } }).term;
    if (!termDelegate?.findMany) {
      console.error('Terms GET error: Prisma client is missing `term` delegate. Run prisma generate and redeploy.');
      return NextResponse.json(
        {
          status: 'error',
          code: 'PRISMA_CLIENT_OUTDATED',
          message: 'Terms model is not available in Prisma Client. Run prisma generate and redeploy.',
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type) {
      const terms = await termDelegate.findMany({
        where: { type },
        orderBy: { order: 'asc' },
      });
      return NextResponse.json({ status: 'success', data: terms });
    }

    const allTerms = await termDelegate.findMany({
      orderBy: [{ type: 'asc' }, { order: 'asc' }],
    });
    return NextResponse.json({ status: 'success', data: allTerms });
  } catch (error) {
    console.error('Terms GET error:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to fetch terms' }, { status: 500 });
  }
}
