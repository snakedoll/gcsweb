import { NextResponse } from 'next/server';
import { requireAdmin as requireDbAdmin } from '@/lib/admin-auth';

export function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

export async function requireAdmin() {
  const auth = await requireDbAdmin();
  if (!auth.ok && auth.reason === 'UNAUTHORIZED') {
    return {
      ok: false as const,
      response: jsonError(401, 'UNAUTHORIZED', 'Unauthorized'),
    };
  }

  if (!auth.ok && auth.reason === 'FORBIDDEN') {
    return {
      ok: false as const,
      response: jsonError(403, 'FORBIDDEN', 'Forbidden'),
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

  for (const option of input) {
    if (!option || typeof option !== 'object') return { ok: false };
    const name = (option as any).name;
    const values = (option as any).values;
    if (!isNonEmptyString(name) || !Array.isArray(values)) return { ok: false };

    const parsedValues: Array<{ value: string; additionalPrice: number }> = [];
    for (const item of values) {
      if (!item || typeof item !== 'object') return { ok: false };
      const value = (item as any).value;
      const additionalPrice = (item as any).additionalPrice;
      if (!isNonEmptyString(value) || !isNonNegativeInt(additionalPrice)) return { ok: false };
      parsedValues.push({ value: value.trim(), additionalPrice });
    }

    result.push({ name: name.trim(), values: parsedValues });
  }

  return { ok: true, value: result };
}
