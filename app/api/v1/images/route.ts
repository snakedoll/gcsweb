import fs from 'fs';
import path from 'path';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

type UsagePolicy = {
  pathPrefix: string;
  maxBytes: number;
  allowedMimes: string[];
  requiresAdmin: boolean;
};

const MB = 1024 * 1024;
const MIME_TO_EXTS: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

// NOTE: PROFILE 정책은 명세가 미확정이라 기존 동작(10MB, JPEG/PNG/WEBP) 기준으로 유지합니다.
const USAGE_POLICIES: Record<string, UsagePolicy> = {
  PROFILE: {
    pathPrefix: 'profile',
    maxBytes: 10 * MB,
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp'],
    requiresAdmin: false,
  },
  PROJECT_THUMBNAIL: {
    pathPrefix: 'project/thumbnail',
    maxBytes: 50 * MB,
    allowedMimes: ['image/jpeg', 'image/png'],
    requiresAdmin: true,
  },
  PROJECT_DETAIL: {
    pathPrefix: 'project/detail',
    maxBytes: 50 * MB,
    allowedMimes: ['image/jpeg', 'image/png'],
    requiresAdmin: true,
  },
  BANK_ACCOUNT: {
    pathPrefix: 'team/account',
    maxBytes: 50 * MB,
    allowedMimes: ['image/jpeg', 'image/png'],
    requiresAdmin: true,
  },
};

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

function getUsageFromRequest(request: Request, formData: FormData) {
  const url = new URL(request.url);
  const queryUsage = url.searchParams.get('usage');
  const bodyUsage = formData.get('usage');
  return (queryUsage ?? (typeof bodyUsage === 'string' ? bodyUsage : '')).trim();
}

function sanitizeBaseName(fileName: string) {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').slice(0, 80);
  return safe || 'image';
}

function yyyymmdd(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function randomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
}

function inferCanonicalExt(mimeType: string) {
  if (mimeType === 'image/jpeg') return '.jpg';
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  return '.bin';
}

function validateFile(file: File, policy: UsagePolicy) {
  const size = Number(file.size ?? 0);
  if (!size) {
    return {
      ok: false as const,
      response: errorResponse(400, 'INVALID_FILE', '파일이 비어있거나 지원하지 않는 이미지 형식입니다.'),
    };
  }

  const mimeType = String(file.type ?? '').toLowerCase();
  if (!mimeType || !policy.allowedMimes.includes(mimeType)) {
    return {
      ok: false as const,
      response: errorResponse(400, 'INVALID_FILE', '지원하지 않는 이미지 형식입니다.'),
    };
  }

  const ext = path.extname(file.name || '').toLowerCase();
  const allowedExts = new Set(policy.allowedMimes.flatMap((mime) => MIME_TO_EXTS[mime] ?? []));
  if (!ext || !allowedExts.has(ext)) {
    return {
      ok: false as const,
      response: errorResponse(400, 'INVALID_FILE', '지원하지 않는 이미지 형식입니다.'),
    };
  }

  if (size > policy.maxBytes) {
    return {
      ok: false as const,
      response: errorResponse(413, 'FILE_TOO_LARGE', '파일 크기가 허용 용량을 초과했습니다.'),
    };
  }

  return { ok: true as const, size, mimeType, ext };
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return errorResponse(401, 'UNAUTHORIZED', '토큰이 만료되었거나 유효하지 않습니다.');
    }

    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
      return errorResponse(400, 'INVALID_INPUT', 'usage와 image는 필수입니다.');
    }

    const formData = await request.formData();
    const usage = getUsageFromRequest(request, formData);
    const imageEntry = formData.get('image');
    const file = imageEntry instanceof File ? imageEntry : null;

    if (!usage || !file) {
      return errorResponse(400, 'INVALID_INPUT', 'usage와 image는 필수입니다.');
    }

    const policy = USAGE_POLICIES[usage];
    if (!policy) {
      return errorResponse(400, 'INVALID_USAGE', '지원하지 않는 usage 값입니다.');
    }

    if (policy.requiresAdmin) {
      const adminUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { memberType: true },
      });

      if (!adminUser || Number(adminUser.memberType) !== 2) {
        return errorResponse(403, 'FORBIDDEN', '해당 이미지 업로드 권한이 없습니다.');
      }
    }

    const validated = validateFile(file, policy);
    if (!validated.ok) {
      return validated.response;
    }

    const finalExt = validated.ext || inferCanonicalExt(validated.mimeType);
    const fileName = `${yyyymmdd()}_${randomId()}_${sanitizeBaseName(file.name)}${finalExt}`;

    const uploadsRoot = path.join(process.cwd(), 'public', 'uploads');
    const usageDir = path.join(uploadsRoot, ...policy.pathPrefix.split('/'));
    fs.mkdirSync(usageDir, { recursive: true });

    const outputPath = path.join(usageDir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());

    try {
      await fs.promises.writeFile(outputPath, buffer);
    } catch (uploadError) {
      console.error('Image upload storage error:', uploadError);
      return errorResponse(500, 'UPLOAD_FAILED', '이미지 업로드에 실패했습니다.');
    }

    const relativeUrl = `/uploads/${policy.pathPrefix}/${fileName}`.replace(/\\/g, '/');
    const publicUrl = new URL(relativeUrl, request.url).toString();

    try {
      const repo = prisma as any;
      await repo.image.create({
        data: {
          usage,
          fileSize: validated.size,
          mimeType: validated.mimeType,
          imageUrl: publicUrl,
        },
      });
    } catch (dbError) {
      console.error('Image metadata save error:', dbError);
      await fs.promises.unlink(outputPath).catch(() => undefined);
      return errorResponse(500, 'SERVER_ERROR', '서버 내부 오류 발생.');
    }

    return NextResponse.json({
      status: 'success',
      data: { imageUrl: publicUrl },
    });
  } catch (error) {
    console.error('Image upload API error:', error);
    return errorResponse(500, 'SERVER_ERROR', '서버 내부 오류 발생.');
  }
}
