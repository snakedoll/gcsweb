import { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import {
  assignOrderNumber,
  createUnnumberedOrderNumber,
  getOrderTimeKey,
  isOrderNumberConflict,
  issueOrderNumber,
  ORDER_NUMBER_MAX_RETRIES,
  withOrderNumberRetry,
} from './order-number';

const conflict = (target: unknown) =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target },
  });

describe('getOrderTimeKey', () => {
  it('KST 날짜(YYMMDD)로 만든다', () => {
    expect(getOrderTimeKey(new Date('2026-04-03T03:00:00Z'))).toBe('260403');
  });

  it('UTC 로는 전날이어도 KST 자정을 넘으면 다음 날이다', () => {
    expect(getOrderTimeKey(new Date('2026-04-02T14:59:59Z'))).toBe('260402');
    expect(getOrderTimeKey(new Date('2026-04-02T15:00:00Z'))).toBe('260403');
  });

  it('잘못된 날짜는 예외', () => {
    expect(() => getOrderTimeKey(new Date('invalid'))).toThrow();
  });
});

describe('issueOrderNumber', () => {
  const makeTx = (max: number | null) => ({
    $executeRaw: vi.fn().mockResolvedValue(1),
    orderNumber: {
      aggregate: vi.fn().mockResolvedValue({ _max: { orderNo: max } }),
      create: vi.fn().mockResolvedValue({}),
    },
  });

  it('해당 상점·일자의 첫 주문은 1번', async () => {
    const tx = makeTx(null);
    const result = await issueOrderNumber(tx as never, {
      orderId: 'o1',
      storeId: 's1',
      now: new Date('2026-04-03T03:00:00Z'),
    });

    expect(result).toEqual({ orderNo: 1, orderTimeKey: '260403' });
    expect(tx.orderNumber.aggregate.mock.calls[0][0].where).toEqual({ storeId: 's1', orderTimeKey: '260403' });
    expect(tx.orderNumber.create).toHaveBeenCalledWith({
      data: { orderId: 'o1', orderNo: 1, type: 'ONSITE', storeId: 's1', orderTimeKey: '260403' },
    });
  });

  it('기존 최대 번호 + 1 을 발급하고 먼저 advisory lock 을 잡는다', async () => {
    const tx = makeTx(147);
    const result = await issueOrderNumber(tx as never, { orderId: 'o2', storeId: 's1', now: new Date('2026-04-03T03:00:00Z') });

    expect(result.orderNo).toBe(148);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.orderNumber.aggregate.mock.invocationCallOrder[0]);
  });

  it('주문 유형을 지정할 수 있다', async () => {
    const tx = makeTx(null);
    await issueOrderNumber(tx as never, { orderId: 'o3', storeId: 's1', type: 'PRE_ORDER' });
    expect(tx.orderNumber.create.mock.calls[0][0].data.type).toBe('PRE_ORDER');
  });
});

describe('createUnnumberedOrderNumber', () => {
  it('번호·일자 없이 상점과 잇는 행만 만든다', async () => {
    const tx = { orderNumber: { create: vi.fn().mockResolvedValue({}) } };
    await createUnnumberedOrderNumber(tx as never, { orderId: 'o1', storeId: 's1' });
    expect(tx.orderNumber.create).toHaveBeenCalledWith({
      data: { orderId: 'o1', storeId: 's1', type: 'ONSITE', orderNo: null, orderTimeKey: null },
    });
  });
});

describe('assignOrderNumber', () => {
  const makeTx = (row: unknown, max: number | null = null) => ({
    $executeRaw: vi.fn().mockResolvedValue(1),
    orderNumber: {
      findUnique: vi.fn().mockResolvedValue(row),
      aggregate: vi.fn().mockResolvedValue({ _max: { orderNo: max } }),
      update: vi.fn().mockResolvedValue({}),
    },
  });

  it('결제 시각의 KST 일자로 다음 번호를 채운다', async () => {
    const tx = makeTx({ storeId: 's1', orderNo: null, orderTimeKey: null }, 2);
    const result = await assignOrderNumber(tx as never, { orderId: 'o1', paidAt: new Date('2026-04-02T15:00:00Z') });

    expect(result).toEqual({ orderNo: 3, orderTimeKey: '260403' });
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.orderNumber.aggregate.mock.invocationCallOrder[0]);
    expect(tx.orderNumber.update).toHaveBeenCalledWith({ where: { orderId: 'o1' }, data: { orderNo: 3, orderTimeKey: '260403' } });
  });

  it('이미 번호가 있으면 그대로 둔다', async () => {
    const tx = makeTx({ storeId: 's1', orderNo: 9, orderTimeKey: '260401' });
    const result = await assignOrderNumber(tx as never, { orderId: 'o1', paidAt: new Date('2026-04-03T03:00:00Z') });

    expect(result).toEqual({ orderNo: 9, orderTimeKey: '260401' });
    expect(tx.$executeRaw).not.toHaveBeenCalled();
    expect(tx.orderNumber.update).not.toHaveBeenCalled();
  });

  it('OrderNumber 행이 없으면 null', async () => {
    const tx = makeTx(null);
    expect(await assignOrderNumber(tx as never, { orderId: 'x', paidAt: new Date() })).toBeNull();
  });
});

describe('isOrderNumberConflict', () => {
  it('orderNo 가 포함된 unique 충돌만 true', () => {
    expect(isOrderNumberConflict(conflict(['storeId', 'orderTimeKey', 'orderNo']))).toBe(true);
    expect(isOrderNumberConflict(conflict('OrderNumber_storeId_orderTimeKey_orderNo_key'))).toBe(true);
    expect(isOrderNumberConflict(conflict(['impUid']))).toBe(false);
    expect(isOrderNumberConflict(new Error('x'))).toBe(false);
  });
});

describe('withOrderNumberRetry', () => {
  it('충돌하면 다시 실행해서 성공한 결과를 돌려준다', async () => {
    const run = vi.fn().mockRejectedValueOnce(conflict(['orderNo'])).mockResolvedValue('ok');
    await expect(withOrderNumberRetry(run)).resolves.toBe('ok');
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('최대 횟수까지 충돌하면 마지막 오류를 던진다', async () => {
    const run = vi.fn().mockRejectedValue(conflict(['orderNo']));
    await expect(withOrderNumberRetry(run)).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    expect(run).toHaveBeenCalledTimes(ORDER_NUMBER_MAX_RETRIES);
  });

  it('충돌이 아닌 오류는 재시도하지 않는다', async () => {
    const run = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(withOrderNumberRetry(run)).rejects.toThrow('boom');
    expect(run).toHaveBeenCalledTimes(1);
  });
});
