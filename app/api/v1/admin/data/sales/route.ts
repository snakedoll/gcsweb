import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const DEFAULT_DAYS = 4;
const MAX_DAYS = 31;

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

function parseDateKey(input: string): { year: number; month: number; day: number } | null {
  const match = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(utc.getTime()) ||
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function addDaysToDateKey(dateKey: string, days: number): string {
  const parsed = parseDateKey(dateKey);
  if (!parsed) {
    throw new Error('invalid dateKey');
  }

  const base = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  base.setUTCDate(base.getUTCDate() + days);

  const year = String(base.getUTCFullYear());
  const month = String(base.getUTCMonth() + 1).padStart(2, '0');
  const day = String(base.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toSeoulDayUtcRange(dateKey: string): { utcStart: Date; utcEnd: Date } {
  const parsed = parseDateKey(dateKey);
  if (!parsed) {
    throw new Error('invalid dateKey');
  }

  // KST(UTC+9) 자정 기준 일자 범위를 UTC로 변환한다.
  const utcStart = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, -9, 0, 0, 0));
  const utcEnd = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + 1, -9, 0, 0, 0));
  return { utcStart, utcEnd };
}

function toSeoulDateKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error('failed to format date in Asia/Seoul');
  }

  return `${year}-${month}-${day}`;
}

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      if (auth.reason === 'UNAUTHORIZED') {
        return jsonError(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
      }
      return jsonError(403, 'FORBIDDEN', '관리자 권한이 필요합니다.');
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate')?.trim() ?? '';
    const daysParam = searchParams.get('days')?.trim() ?? '';

    const startDate = startDateParam || toSeoulDateKey();
    if (!parseDateKey(startDate)) {
      return jsonError(400, 'INVALID_INPUT', 'startDate는 YYYY-MM-DD 형식이어야 합니다.');
    }

    let days = DEFAULT_DAYS;
    if (daysParam) {
      const parsedDays = Number(daysParam);
      if (!Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > MAX_DAYS) {
        return jsonError(400, 'INVALID_INPUT', `days는 1 이상 ${MAX_DAYS} 이하의 정수여야 합니다.`);
      }
      days = parsedDays;
    }

    const dateKeys = Array.from({ length: days }, (_, idx) => addDaysToDateKey(startDate, idx));

    const dailyAmounts = await Promise.all(
      dateKeys.map(async (dateKey) => {
        const { utcStart, utcEnd } = toSeoulDayUtcRange(dateKey);

        const aggregated = await prisma.fairShopHistory.aggregate({
          where: {
            createdAt: {
              gte: utcStart,
              lt: utcEnd,
            },
          },
          _sum: {
            paymentAmount: true,
          },
        });

        return {
          date: dateKey,
          salesAmount: Number(aggregated._sum.paymentAmount ?? 0),
        };
      })
    );

    let cumulative = 0;
    const rows = dailyAmounts.map((row, idx) => {
      cumulative += row.salesAmount;
      return {
        day: idx + 1,
        periodLabel: `${idx + 1}일차`,
        date: row.date,
        salesAmount: row.salesAmount,
        cumulativeSalesAmount: cumulative,
      };
    });

    return NextResponse.json({
      status: 'success',
      data: {
        startDate,
        days,
        rows,
      },
    });
  } catch (error) {
    console.error('[Admin Onsite Data Sales GET Error]', error);
    return jsonError(500, 'SERVER_ERROR', '서버 오류가 발생했습니다.');
  }
}
