import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import { apiError, apiErrors } from '@/lib/api-response';

export const runtime = 'nodejs';

// POST: Batch update terms for a specific type
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const prismaTermDelegate = (prisma as unknown as {
      term?: {
        deleteMany: (args?: unknown) => Promise<unknown>;
        createMany: (args?: unknown) => Promise<unknown>;
      };
    }).term;
    if (!prismaTermDelegate?.deleteMany || !prismaTermDelegate?.createMany) {
      console.error('Terms POST error: Prisma client is missing `term` delegate. Run prisma generate and redeploy.');
      return apiError(500, 'PRISMA_CLIENT_OUTDATED', 'Terms model is not available in Prisma Client. Run prisma generate and redeploy.');
    }

    const body = await request.json();
    const { type, terms } = body; // terms: Array<{ mainTitle, subTitle, body }>

    if (!type || !Array.isArray(terms)) {
      return apiErrors.invalidInput('Invalid input');
    }

    // Process update in a transaction: delete existing for this type and insert new ones
    await prisma.$transaction(async (tx) => {
      const txTermDelegate = (tx as unknown as {
        term?: {
          deleteMany: (args?: unknown) => Promise<unknown>;
          createMany: (args?: unknown) => Promise<unknown>;
        };
      }).term;
      if (!txTermDelegate?.deleteMany || !txTermDelegate?.createMany) {
        throw new Error('Prisma transaction client is missing `term` delegate.');
      }

      await txTermDelegate.deleteMany({
        where: { type },
      });

      if (terms.length > 0) {
        await txTermDelegate.createMany({
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
    return apiErrors.serverError('Failed to update terms');
  }
}
