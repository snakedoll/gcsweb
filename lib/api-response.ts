import { NextResponse } from 'next/server';

export function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

export function apiSuccess<T>(data: T, code?: string) {
  return NextResponse.json({ status: 'success', ...(code ? { code } : {}), data });
}
