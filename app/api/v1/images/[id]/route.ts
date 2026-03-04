import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const image = await prisma.image.findUnique({
      where: { id: params.id },
      select: { data: true, mimeType: true },
    });

    if (!image || !image.data) {
      return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(Buffer.from(image.data) as unknown as BodyInit, {
      headers: {
        'Content-Type': image.mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
