import { Prisma, type OrderType } from '@prisma/client';

/**
 * QR샵 주문번호(OrderNumber.orderNo). (상점, KST 일자) 안에서 1부터 매기는 순번이다.
 * 자릿수는 고정하지 않으며 표시용 0 채움은 프론트가 한다.
 */
const ORDER_TIME_ZONE = 'Asia/Seoul';
export const ORDER_NUMBER_MAX_RETRIES = 3;

type Tx = Pick<Prisma.TransactionClient, '$executeRaw' | 'orderNumber'>;
// 주문번호는 QR샵은 결제 확정 때(assignOrderNumber), /shop 은 주문 생성 때(issueOrderNumber) 발급한다.

/** 주문 일자 키(KST YYMMDD). */
export function getOrderTimeKey(date: Date = new Date()): string {
  if (Number.isNaN(date.getTime())) {
    throw new Error('invalid date');
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ORDER_TIME_ZONE,
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  if (!year || !month || !day) {
    throw new Error('failed to format order time key');
  }

  return `${year}${month}${day}`;
}

/**
 * (상점, 일자)의 다음 번호. 호출한 트랜잭션이 끝날 때까지 그 (상점, 일자)의 발급을 막는다.
 *
 * advisory lock 으로 같은 상점의 동시 발급을 직렬화해 max+1 이 겹치지 않게 하고,
 * unique 제약은 최후의 방어선으로 둔다(충돌 시 `withOrderNumberRetry` 로 트랜잭션째 재시도).
 */
async function nextOrderNo(tx: Tx, storeId: string, orderTimeKey: string): Promise<number> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`order-number:${storeId}:${orderTimeKey}`}))`;

  const { _max } = await tx.orderNumber.aggregate({
    where: { storeId, orderTimeKey },
    _max: { orderNo: true },
  });
  return (_max.orderNo ?? 0) + 1;
}

/**
 * 주문번호를 바로 발급해 OrderNumber 행을 만든다. 반드시 주문 생성과 같은 트랜잭션 안에서 호출한다.
 * /shop 주문(v1)이 쓴다. QR샵 주문은 `createUnnumberedOrderNumber` + `assignOrderNumber`(결제 확정 때 발급).
 */
export async function issueOrderNumber(
  tx: Tx,
  params: { orderId: string; storeId: string; type?: OrderType; now?: Date },
): Promise<{ orderNo: number; orderTimeKey: string }> {
  const { orderId, storeId, type = 'ONSITE', now = new Date() } = params;
  const orderTimeKey = getOrderTimeKey(now);
  const orderNo = await nextOrderNo(tx, storeId, orderTimeKey);

  await tx.orderNumber.create({ data: { orderId, orderNo, type, storeId, orderTimeKey } });
  return { orderNo, orderTimeKey };
}

/**
 * 번호 없이 OrderNumber 행만 만든다(주문과 상점을 잇는다). QR샵 주문 생성 트랜잭션 안에서 호출한다.
 * 번호와 일자는 결제 확정 때 `assignOrderNumber` 가 채운다.
 */
export async function createUnnumberedOrderNumber(
  tx: Pick<Prisma.TransactionClient, 'orderNumber'>,
  params: { orderId: string; storeId: string; type?: OrderType },
): Promise<void> {
  const { orderId, storeId, type = 'ONSITE' } = params;
  await tx.orderNumber.create({ data: { orderId, storeId, type, orderNo: null, orderTimeKey: null } });
}

/**
 * 결제 확정 때 주문번호를 발급한다. 결제 확정 트랜잭션 안에서 호출한다.
 *
 * - 일자는 결제 시각(`paidAt`)의 KST 날짜다. 확정이 다음 날 늦게 처리돼도 결제한 날의 번호를 받는다.
 * - 이미 번호가 있으면(생성 때 발급하던 이전 방식의 주문) 그대로 둔다.
 */
export async function assignOrderNumber(
  tx: Tx,
  params: { orderId: string; paidAt: Date },
): Promise<{ orderNo: number; orderTimeKey: string } | null> {
  const row = await tx.orderNumber.findUnique({
    where: { orderId: params.orderId },
    select: { storeId: true, orderNo: true, orderTimeKey: true },
  });
  if (!row) return null;
  if (row.orderNo !== null && row.orderTimeKey !== null) {
    return { orderNo: row.orderNo, orderTimeKey: row.orderTimeKey };
  }

  const orderTimeKey = getOrderTimeKey(params.paidAt);
  const orderNo = await nextOrderNo(tx, row.storeId, orderTimeKey);
  await tx.orderNumber.update({ where: { orderId: params.orderId }, data: { orderNo, orderTimeKey } });
  return { orderNo, orderTimeKey };
}

/** OrderNumber 의 (storeId, orderTimeKey, orderNo) unique 충돌인지. */
export function isOrderNumberConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') return false;
  const target = error.meta?.target;
  const fields = Array.isArray(target) ? target.join(',') : String(target ?? '');
  return fields.includes('orderNo');
}

/** 주문번호 unique 충돌이면 `run`(트랜잭션 전체)을 최대 3회까지 다시 실행한다. */
export async function withOrderNumberRetry<T>(run: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= ORDER_NUMBER_MAX_RETRIES || !isOrderNumberConflict(error)) throw error;
    }
  }
}
