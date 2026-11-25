export class StoreApiError extends Error {
  constructor(public code: string, message: string, public status: number, public data?: unknown) {
    super(message);
    this.name = 'StoreApiError';
  }
}

const errorMessages: Record<string, string> = {
  UNAUTHORIZED: '로그인이 필요해요. 다시 로그인해주세요.',
  NOT_FOUND: '상점 또는 요청한 항목을 찾을 수 없어요.',
  STORE_ALREADY_EXISTS: '이미 등록한 상점이 있어요. 다시 불러와주세요.',
  STORE_SLUG_TAKEN: '이미 사용 중인 상점 아이디입니다. 다시 확인해주세요.',
  PRODUCT_HAS_SALES: '판매 이력이 있는 상품은 삭제할 수 없어요.',
  PRODUCT_PRICE_LOCKED: '판매 이력이 있는 상품의 가격과 기존 옵션 추가금은 변경할 수 없어요.',
  PRODUCT_OPTION_DELETE_LOCKED: '판매 이력이 있는 상품의 기존 옵션은 삭제할 수 없어요.',
  STORE_REQUIRED: '상점을 먼저 등록해주세요.',
  STORE_HAS_SALES: '판매 이력이 있는 상점은 삭제할 수 없어요.',
  ORDER_ALREADY_REFUNDED: '이미 환불된 주문이에요.',
  ORDER_NOT_REFUNDABLE: '이 주문은 환불할 수 없어요.',
  REFUND_PENDING: '환불 처리 중이에요. 주문 목록에서 상태를 확인해주세요.',
};

export async function requestSalesApi<T>(path: string, init?: RequestInit, base = '/api/v2/qrshop'): Promise<T> {
  const response = await fetch(`${base}${path}`, { credentials: 'same-origin', cache: 'no-store', ...init });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.status !== 'success') {
    const code = body?.code ?? 'SERVER_ERROR';
    throw new StoreApiError(code, errorMessages[code] ?? body?.message ?? '요청에 실패했어요. 다시 시도해주세요.', response.status, body?.data);
  }
  return body.data as T;
}

export function withOperationalStore(path: string, storeSlug?: string): string {
  if (storeSlug === undefined) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}storeSlug=${encodeURIComponent(storeSlug)}`;
}
