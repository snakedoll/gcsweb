export type SaleStatus = 'scheduled' | 'active' | 'completed';

const KST_TIME_ZONE = 'Asia/Seoul';

function getKstDateKeyFromDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: KST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

function parseInputToDateKey(input: string | Date): string | null {
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return null;
    return getKstDateKeyFromDate(input);
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    const ymd = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (ymd) return ymd[1];

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    return getKstDateKeyFromDate(parsed);
  }

  return null;
}

function toEpochDay(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map((v) => Number(v));
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

// 판매 시작일과 종료일을 입력받아 현재 판매 상태를 반환하는 함수
export function getSaleStatusByDate(
  salesStartDate: string | Date | null,
  salesEndDate: string | Date | null,
  now: Date = new Date()
): SaleStatus {
  const nowKey = parseInputToDateKey(now);
  const startKey = salesStartDate ? parseInputToDateKey(salesStartDate) : null;
  const endKey = salesEndDate ? parseInputToDateKey(salesEndDate) : null;

  if (!nowKey || !startKey || !endKey) return 'completed';
  if (nowKey < startKey) return 'scheduled';
  if (nowKey > endKey) return 'completed';
  return 'active';
}

export function getDdayText(salesEndDate: string | Date | null, now: Date = new Date()): string {
  const nowKey = parseInputToDateKey(now);
  const endKey = salesEndDate ? parseInputToDateKey(salesEndDate) : null;

  if (!nowKey || !endKey) return '진행완료';

  const diff = toEpochDay(endKey) - toEpochDay(nowKey);
  if (diff < 0) return '진행완료';
  if (diff === 0) return 'D-day';
  return `D-${diff}`;
}
