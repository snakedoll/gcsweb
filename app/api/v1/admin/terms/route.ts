import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const runtime = 'nodejs';

// POST: Batch update terms for a specific type
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Authorization check
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, terms } = body; // terms: Array<{ mainTitle, subTitle, body }>

    if (!type || !Array.isArray(terms)) {
      return NextResponse.json({ status: 'error', message: 'Invalid input' }, { status: 400 });
    }

    // Process update in a transaction: delete existing for this type and insert new ones
    await prisma.$transaction(async (tx) => {
      await tx.term.deleteMany({
        where: { type },
      });

      if (terms.length > 0) {
        await tx.term.createMany({
          data: terms.map((t: any, index: number) => ({
            type,
            mainTitle: t.mainTitle,
            subTitle: t.subTitle || '',
            body: t.body,
            order: index,
          })),
        });
      }
    });

    return NextResponse.json({ status: 'success', message: 'Terms updated successfully' });
  } catch (error) {
    console.error('Terms POST error:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to update terms' }, { status: 500 });
  }
}
