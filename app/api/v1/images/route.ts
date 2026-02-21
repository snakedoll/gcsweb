import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ status: 'error', code: 'UNAUTHORIZED', message: '토큰이 없거나 만료되었습니다.' }, { status: 401 });
    }

    // Try to parse multipart/form-data via standard FormData API
    const contentType = request.headers.get('content-type') ?? '';

    let file: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const f = formData.get('image') as File | null;
      if (!f) {
        return NextResponse.json({ status: 'error', code: 'INVALID_FILE', message: '파일이 없습니다.' }, { status: 400 });
      }
      file = f;
    } else {
      // also accept JSON with base64 / dataUrl in `image` field
      const body = await request.json().catch(() => ({}));
      const data = body?.image ?? body?.dataUrl ?? body?.profileImageUrl;
      if (!data) {
        return NextResponse.json({ status: 'error', code: 'INVALID_FILE', message: '파일이 없습니다.' }, { status: 400 });
      }
      // data is expected to be a data URL like data:image/png;base64,AAAA
      if (typeof data !== 'string' || !data.startsWith('data:')) {
        return NextResponse.json({ status: 'error', code: 'INVALID_FILE', message: '올바른 data URL 형식이 아닙니다.' }, { status: 400 });
      }
      // create a File-like wrapper
      const matches = data.match(/^data:(.+);base64,(.+)$/);
      if (!matches) {
        return NextResponse.json({ status: 'error', code: 'INVALID_FILE', message: '지원하지 않는 데이터 형식입니다.' }, { status: 400 });
      }
      const mime = matches[1];
      const base64 = matches[2];
      const buffer = Buffer.from(base64, 'base64');
      // create a minimal File-like object
      file = new File([buffer], 'upload', { type: mime });
      // @ts-ignore attach arrayBuffer method
      (file as any).arrayBuffer = async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    }

    if (!file) {
      return NextResponse.json({ status: 'error', code: 'INVALID_FILE', message: '파일이 없습니다.' }, { status: 400 });
    }

    const size = Number((file as any).size ?? 0);
    const type = (file as any).type ?? '';

    if (!ALLOWED_TYPES.includes(type)) {
      return NextResponse.json({ status: 'error', code: 'INVALID_FILE', message: '지원하지 않는 파일 형식입니다.' }, { status: 400 });
    }

    if (size > MAX_FILE_SIZE) {
      return NextResponse.json({ status: 'error', code: 'FILE_TOO_LARGE', message: '이미지 파일은 10MB를 초과할 수 없습니다.' }, { status: 413 });
    }

    // ensure uploads dir exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const ext = type.split('/')[1] ?? 'bin';
    const filename = `${Date.now()}_${cryptoRandomId()}.${ext}`;
    const outPath = path.join(uploadsDir, filename);

    const arrayBuffer = await (file as any).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.promises.writeFile(outPath, buffer);

    const publicUrl = `/uploads/${filename}`;

    return NextResponse.json({ status: 'success', data: { imageUrl: publicUrl } });
  } catch (error: any) {
    console.error('image upload error', error);
    return NextResponse.json({ status: 'error', code: 'SERVER_ERROR', message: '이미지 업로드 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

function cryptoRandomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // fallback
  return Math.random().toString(36).slice(2, 10);
}
