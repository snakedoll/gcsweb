// Credentials stay in this tab, keyed by order; never return them in an order view model.
type PaymentSession = {
  storeSlug: string;
  guestToken: string;
  payment: { storeId: string; channelKey: string; orderName: string };
};

const prefix = 'gcs:qrshop:payment:';
export const PAYMENT_SESSION_MISSING = '이 탭의 주문 인증 정보를 찾을 수 없습니다. 결제를 시작한 탭에서 다시 확인해주세요.';
export const PAYMENT_SESSION_UNAVAILABLE = '주문 인증 정보를 안전하게 저장할 수 없습니다. 브라우저의 세션 저장을 허용한 뒤 다시 시도해주세요.';

export function checkPaymentStorage(): void {
  try {
    const key = `${prefix}storage-check`;
    window.sessionStorage.setItem(key, key);
    if (window.sessionStorage.getItem(key) !== key) throw new Error();
    window.sessionStorage.removeItem(key);
  } catch { throw new Error(PAYMENT_SESSION_UNAVAILABLE); }
}

export function savePaymentSession(orderId: string, session: PaymentSession): void {
  try {
    const key = prefix + orderId;
    const value = JSON.stringify(session);
    window.sessionStorage.setItem(key, value);
    if (window.sessionStorage.getItem(key) !== value) throw new Error();
  } catch {
    throw new Error('주문은 생성되었지만 인증 정보 저장에 실패해 결제를 시작하지 않았습니다. ' + PAYMENT_SESSION_UNAVAILABLE);
  }
}

export function readPaymentSession(orderId: string, storeSlug: string): PaymentSession {
  try {
    const value = window.sessionStorage.getItem(prefix + orderId);
    const session: PaymentSession | null = value ? JSON.parse(value) : null;
    if (session?.storeSlug === storeSlug && session.guestToken && session.payment?.storeId && session.payment.channelKey && session.payment.orderName) return session;
  } catch { /* Missing, corrupt, or blocked storage must never fall back to Mock. */ }
  throw new Error(PAYMENT_SESSION_MISSING);
}

const returnPrefix = 'gcs:qrshop:return:';

type CatalogOrder = { orderId: string; orderedAt?: string };

export function readCatalogOrder(storeSlug: string): CatalogOrder | null {
  try {
    const value = window.sessionStorage.getItem(returnPrefix + storeSlug);
    if (!value) return null;
    // Previous versions stored just the order ID.
    if (!value.startsWith('{')) return { orderId: value };
    const order = JSON.parse(value) as CatalogOrder;
    return typeof order.orderId === 'string' ? order : null;
  } catch { return null; }
}

// The result page remembers the latest paid order, and the catalog rechecks
// its payment status before displaying the number.
export function rememberCatalogOrder(storeSlug: string, order: { orderId: string; orderedAt: string }): void {
  try {
    readPaymentSession(order.orderId, storeSlug);
    const previous = readCatalogOrder(storeSlug);
    if (previous?.orderedAt && Date.parse(previous.orderedAt) > Date.parse(order.orderedAt)) return;
    window.sessionStorage.setItem(returnPrefix + storeSlug, JSON.stringify(order));
  } catch { /* A blocked store must not prevent returning to the catalog. */ }
}

type CheckoutCart = {
  orderId: string;
  quantities: Record<string, number>;
  restore: boolean;
};

const checkoutCartKey = (storeSlug: string | null) =>
  `gcs:qrshop:checkout-cart:${storeSlug === null ? 'mock' : `store:${storeSlug}`}`;

export function rememberCheckoutCart(storeSlug: string | null, orderId: string, quantities: CheckoutCart['quantities']): void {
  try {
    window.sessionStorage.setItem(checkoutCartKey(storeSlug), JSON.stringify({ orderId, quantities, restore: false }));
  } catch { /* Checkout can proceed without the optional cart recovery. */ }
}

export function markRefundCart(storeSlug: string | null, orderId: string): void {
  try {
    const key = checkoutCartKey(storeSlug);
    const cart = JSON.parse(window.sessionStorage.getItem(key) ?? 'null') as CheckoutCart | null;
    if (cart?.orderId === orderId) window.sessionStorage.setItem(key, JSON.stringify({ ...cart, restore: true }));
  } catch { /* The order result is still available. */ }
}

export function takeRefundCart(storeSlug: string | null): CheckoutCart['quantities'] | null {
  try {
    const key = checkoutCartKey(storeSlug);
    const cart = JSON.parse(window.sessionStorage.getItem(key) ?? 'null') as CheckoutCart | null;
    if (!cart?.restore) return null;
    window.sessionStorage.removeItem(key);
    return cart.quantities;
  } catch { return null; }
}
