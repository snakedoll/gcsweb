import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { apiError as errorResponse } from '@/lib/api-response';

type ProjectPublicBody = {
  projectId?: string;
  isPublic?: boolean;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export async function PATCH(
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

    const body = (await request.json().catch(() => ({}))) as ProjectPublicBody;
    const pathProjectId = isNonEmptyString(params?.projectId) ? params.projectId.trim() : '';

    if (!pathProjectId || !isNonEmptyString(body.projectId) || typeof body.isPublic !== 'boolean') {
      return errorResponse(400, 'INVALID_INPUT', '필수 입력값 누락 또는 형식 오류');
    }

    const bodyProjectId = body.projectId.trim();
    const safeIsPublic = body.isPublic;

    if (bodyProjectId !== pathProjectId) {
      return errorResponse(400, 'INVALID_INPUT', '필수 입력값 누락 또는 형식 오류');
    }

    const repo = prisma as any;
    const project = await repo.project.findUnique({
      where: { id: pathProjectId },
      select: { id: true, softDeletedAt: true },
    });

    if (!project) {
      return errorResponse(404, 'PROJECT_NOT_FOUND', '유효하지 않은 projectId입니다.');
    }

    if (project.softDeletedAt) {
      return errorResponse(409, 'ALREADY_DELETED', '이미 삭제된 프로젝트입니다.');
    }

    const updated = await repo.project.update({
      where: { id: pathProjectId },
      data: { isPublic: safeIsPublic },
      select: { id: true, isPublic: true, updatedAt: true },
    });

    return NextResponse.json({
      status: 'success',
      data: {
        project: {
          projectId: updated.id,
          isPublic: updated.isPublic,
          updatedAt: updated.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error('Admin project public toggle error:', error);
    return errorResponse(500, 'SERVER_ERROR', '서버 오류 발생.');
  }
}
