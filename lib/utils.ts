import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(value: number | string | null | undefined) {
  const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(numericValue)) {
    return '0';
  }
  return numericValue.toLocaleString('ko-KR');
}

export function formatWon(value: number | string | null | undefined) {
  return `${formatPrice(value)}원`;
}

export function formatDate(date: Date | string | null | undefined) {
  if (date == null) return '';

  const normalizedDate = typeof date === 'string' ? date.trim() : date;
  if (!normalizedDate) return '';

  const parsedDate = new Date(normalizedDate);
  if (Number.isNaN(parsedDate.getTime())) return '';

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(parsedDate);
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount);
}
