import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { requireAdmin as requireDbAdmin } from '@/lib/admin-auth';

export function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

type AdminAuthOk = { ok: true; session: Session };
type AdminAuthFail = { ok: false; response: ReturnType<typeof jsonError> };

export async function requireAdmin(): Promise<AdminAuthOk | AdminAuthFail> {
  const auth = await requireDbAdmin();
  if (!auth.ok) {
    const status = auth.reason === 'UNAUTHORIZED' ? 401 : 403;
    return {
      ok: false as const,
      response: jsonError(status, auth.reason, auth.reason === 'UNAUTHORIZED' ? 'Unauthorized' : 'Forbidden'),
    };
  }

  return { ok: true as const, session: auth.session };
}

export function parseOptionalProductType(value: string | null) {
  if (value == null) return { ok: true as const, value: null as number | null };
  if (!/^\d+$/.test(value)) return { ok: false as const, value: null as number | null };
  const parsed = Number(value);
  if (![0, 1, 2].includes(parsed)) return { ok: false as const, value: null as number | null };
  return { ok: true as const, value: parsed };
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isNonNegativeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

export function parseDateTime(value: unknown): Date | null {
  if (!isNonEmptyString(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export type AdminProductOptionInput = {
  name: string;
  values: Array<{ value: string; additionalPrice: number }>;
};

export function parseAdminOptionsInput(
  input: unknown
): { ok: true; value: AdminProductOptionInput[] } | { ok: false } {
  if (input == null) return { ok: true, value: [] };
  if (!Array.isArray(input)) return { ok: false };

  const result: AdminProductOptionInput[] = [];
  const optionNameSet = new Set<string>();

  for (const option of input) {
    if (!option || typeof option !== 'object') return { ok: false };
    const name = (option as any).name;
    const values = (option as any).values;
    if (!isNonEmptyString(name) || !Array.isArray(values)) return { ok: false };
    const trimmedName = name.trim();
    if (optionNameSet.has(trimmedName)) return { ok: false };
    optionNameSet.add(trimmedName);
    if (values.length < 1) return { ok: false };

    const parsedValues: Array<{ value: string; additionalPrice: number }> = [];
    const valueSet = new Set<string>();
    for (const item of values) {
      if (!item || typeof item !== 'object') return { ok: false };
      const value = (item as any).value;
      const additionalPrice = (item as any).additionalPrice;
      if (!isNonEmptyString(value) || !isNonNegativeInt(additionalPrice)) return { ok: false };
      const trimmedValue = value.trim();
      if (valueSet.has(trimmedValue)) return { ok: false };
      valueSet.add(trimmedValue);
      parsedValues.push({ value: trimmedValue, additionalPrice });
    }

    result.push({ name: trimmedName, values: parsedValues });
  }

  return { ok: true, value: result };
}
