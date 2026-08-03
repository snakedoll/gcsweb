import { NextResponse } from 'next/server';

export function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

export function apiSuccess<T>(data: T, code?: string) {
  return NextResponse.json({ status: 'success', ...(code ? { code } : {}), data });
}

// 여러 라우트(팀 등록, 팀 수정 등)에서 코드뿐 아니라 메시지 문구까지 그대로 반복되는 실패 케이스용 프리셋.
// 문구가 그 엔드포인트에서만 다르면 인자로 덮어쓰고, 아니면 기본값을 그대로 씀.
export const apiErrors = {
  invalidInput: (message = '필수 입력값이 누락되었습니다.') => apiError(400, 'INVALID_INPUT', message),
  notFound: (message = '대상을 찾을 수 없습니다.') => apiError(404, 'NOT_FOUND', message),
  conflict: (message = '이미 처리된 요청입니다.') => apiError(409, 'CONFLICT', message),
  serverError: (message = '서버 오류 발생.') => apiError(500, 'SERVER_ERROR', message),
};
