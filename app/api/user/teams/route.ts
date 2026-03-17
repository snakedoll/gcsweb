import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const teams = await prisma.team.findMany({
    where: {
      isSalesTeam: true,
      OR: [
        { userId: session.user.id },
        { teamMember: { has: session.user.id } },
      ],
    },
    select: { id: true, teamName: true },
    orderBy: { teamName: 'asc' },
  });

  return NextResponse.json(teams);
}
