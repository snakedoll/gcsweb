/**
 * 숫자만 추출한 문자열 반환 (예: 01012345678)
 */
export function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 11);
}

/**
 * 숫자만 추출 후 한국 형식으로 하이픈 삽입 (예: 010-1234-5678)
 */
export function formatPhoneWithHyphen(value: string): string {
  const digits = normalizePhoneDigits(value);
  if (digits.length <= 2) return digits;
  if (digits.startsWith('02')) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}
