import { prisma } from '@/lib/db';

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export async function resolveSellerUserIds(candidateUserIds: string[]): Promise<Set<string>> {
  const candidates = uniq(candidateUserIds);
  if (candidates.length === 0) return new Set();

  const teams = await prisma.team.findMany({
    where: {
      isSalesTeam: true,
      OR: [
        { userId: { in: candidates } },
        { teamMember: { hasSome: candidates } },
      ],
    },
    select: {
      userId: true,
      teamMember: true,
    },
  });

  const sellerIds = new Set<string>();
  const candidateSet = new Set(candidates);

  teams.forEach((team) => {
    if (candidateSet.has(team.userId)) {
      sellerIds.add(team.userId);
    }

    if (Array.isArray(team.teamMember)) {
      team.teamMember.forEach((memberId) => {
        if (candidateSet.has(memberId)) {
          sellerIds.add(memberId);
        }
      });
    }
  });

  return sellerIds;
}

export async function syncSellerFlags(candidateUserIds: string[]): Promise<void> {
  const candidates = uniq(candidateUserIds);
  if (candidates.length === 0) return;

  const sellerIds = await resolveSellerUserIds(candidates);
  const sellerList = Array.from(sellerIds);
  const nonSellerList = candidates.filter((id) => !sellerIds.has(id));

  if (sellerList.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: sellerList } },
      data: { isSeller: true },
    });
  }

  if (nonSellerList.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: nonSellerList } },
      data: { isSeller: false },
    });
  }
}
