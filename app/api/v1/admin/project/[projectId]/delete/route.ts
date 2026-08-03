import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { apiError as errorResponse } from '@/lib/api-response';

type ProjectDeleteBody = {
  projectId?: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export async function DELETE(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return errorResponse(401, 'UNAUTHORIZED', '토큰이 만료되었거나 유효하지 않습니다.');
    }

    const adminUser = await prisma.user.findFirst({ where: { email: session.user.email },
      select: { memberType: true },
    });

    if (!adminUser) {
      return errorResponse(401, 'UNAUTHORIZED', '토큰이 만료되었거나 유효하지 않습니다.');
    }

    if (Number(adminUser.memberType) !== 2) {
      return errorResponse(403, 'FORBIDDEN', '어드민 권한이 없습니다.');
    }

    const pathProjectId = isNonEmptyString(params?.projectId) ? params.projectId.trim() : '';
    if (!pathProjectId) {
      return errorResponse(404, 'PROJECT_NOT_FOUND', '유효하지 않은 projectId입니다.');
    }

    // Spec lists projectId in body, but request examples use path only.
    // Accept body when present and validate consistency.
    const body = (await request.json().catch(() => ({}))) as ProjectDeleteBody;
    if (body?.projectId !== undefined) {
      if (!isNonEmptyString(body.projectId) || body.projectId.trim() !== pathProjectId) {
        return errorResponse(404, 'PROJECT_NOT_FOUND', '유효하지 않은 projectId입니다.');
      }
    }

    const repo = prisma as any;
    const existing = await repo.project.findUnique({
      where: { id: pathProjectId },
      select: {
        id: true,
        softDeletedAt: true,
      },
    });

    if (!existing) {
      return errorResponse(404, 'PROJECT_NOT_FOUND', '유효하지 않은 projectId입니다.');
    }

    if (existing.softDeletedAt) {
      return errorResponse(409, 'ALREADY_DELETED', '이미 삭제된 프로젝트입니다.');
    }

    const softDeletedAt = new Date();
    const hardDeleteAt = addDays(softDeletedAt, 30);

    const deleted = await repo.project.update({
      where: { id: pathProjectId },
      data: {
        softDeletedAt,
        hardDeleteAt,
      },
      select: {
        id: true,
        softDeletedAt: true,
        hardDeleteAt: true,
      },
    });

    return NextResponse.json({
      status: 'success',
      data: {
        projectId: deleted.id,
        softDeletedAt: deleted.softDeletedAt,
        hardDeleteAt: deleted.hardDeleteAt,
      },
    });
  } catch (error) {
    console.error('Admin project delete error:', error);
    return errorResponse(500, 'SERVER_ERROR', '서버 내부 오류가 발생했습니다.');
  }
}
