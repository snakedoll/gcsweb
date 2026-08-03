import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { normalizePhoneDigits } from '@/lib/format-phone';
import { apiError as jsonError } from '@/lib/api-response';

export const runtime = 'nodejs';

function maskEmail(email: string): string {
  const atIdx = email.indexOf('@');
  if (atIdx <= 0) return '****@****';
  const local = email.slice(0, atIdx);
  const domain = email.slice(atIdx);
  const visible = local.length <= 3 ? local.slice(0, 1) : local.slice(0, 3);
  return `${visible}****${domain}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const name = body?.name?.trim();
    const phone = body?.phone?.trim();

    if (!name || !phone) {
      return jsonError(400, 'INVALID_INPUT', '이름과 전화번호를 입력해주세요.');
    }

    const phoneDigits = normalizePhoneDigits(phone);
    if (phoneDigits.length < 10) {
      return jsonError(400, 'INVALID_PHONE', '올바른 전화번호를 입력해주세요.');
    }

    const users = await prisma.user.findMany({
      where: { name },
      select: { email: true, phone: true },
    });

    const matched = users.find((u) => u.phone && normalizePhoneDigits(u.phone) === phoneDigits);

    if (!matched) {
      return jsonError(404, 'NOT_FOUND', '해당하는 아이디를 찾을 수 없습니다.');
    }

    return NextResponse.json({
      status: 'success',
      data: { email: maskEmail(matched.email) },
    });
  } catch (error) {
    console.error('find-id error:', error);
    return jsonError(500, 'SERVER_ERROR', '서버 오류가 발생했습니다.');
  }
}
