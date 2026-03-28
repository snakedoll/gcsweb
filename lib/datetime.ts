const SEOUL_TIME_ZONE = 'Asia/Seoul';

type DateTimeParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
};

function getPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)?.value ?? '';
}

export function formatDateTimePartsInSeoul(date: Date | string): DateTimeParts {
  const source = new Date(date);
  if (Number.isNaN(source.getTime())) {
    throw new Error('invalid date');
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SEOUL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(source);

  const year = getPart(parts, 'year');
  const month = getPart(parts, 'month');
  const day = getPart(parts, 'day');
  const hour = getPart(parts, 'hour');
  const minute = getPart(parts, 'minute');

  if (!year || !month || !day || !hour || !minute) {
    throw new Error('failed to format datetime in Asia/Seoul');
  }

  return { year, month, day, hour, minute };
}

export const DATE_TIME_CONFIG = {
  seoulTimeZone: SEOUL_TIME_ZONE,
} as const;
