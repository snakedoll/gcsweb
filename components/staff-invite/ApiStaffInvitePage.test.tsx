import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Page from '@/app/sales-management/v2/staff/join/[inviteCode]/page';

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const invitePath = '/api/v2/qrshop/staff/invite/testcode';
const store = { name: '테스트 상점', imageUrl: null, storeSlug: 'shop123' };
const success = (data: unknown) => Response.json({ status: 'success', data });

beforeEach(() => vi.stubEnv('NEXT_PUBLIC_SALES_MANAGEMENT_DATA_SOURCE', 'api'));

afterEach(() => {
  cleanup();
  router.replace.mockClear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

it('다른 기기에서 승인한 상태를 갱신하고 초대받은 상점의 POS로 이동한다', async () => {
  vi.useFakeTimers();
  const fetch = vi.fn()
    .mockResolvedValueOnce(success({ store, status: 'none' }))
    .mockResolvedValueOnce(success({ storeSlug: store.storeSlug, status: 'pending' }))
    .mockRejectedValueOnce(new Error('temporary network failure'))
    .mockResolvedValueOnce(success({ store, status: 'approved' }));
  vi.stubGlobal('fetch', fetch);

  await act(async () => render(<Page params={{ inviteCode: 'testcode' }} searchParams={{}} />));
  expect(screen.getByText(store.name)).toBeInTheDocument();

  await act(async () => fireEvent.click(screen.getByRole('button', { name: '권한 요청하기' })));
  expect(screen.getByRole('heading', { name: '승인을 기다리고 있습니다' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('요청을 보냈습니다');
  expect(fetch).toHaveBeenNthCalledWith(2, invitePath, expect.objectContaining({ method: 'POST' }));

  await act(async () => vi.advanceTimersByTimeAsync(4000));
  expect(screen.getByRole('heading', { name: '승인을 기다리고 있습니다' })).toBeInTheDocument();
  expect(screen.queryByText('요청을 보냈습니다')).not.toBeInTheDocument();
  expect(router.replace).not.toHaveBeenCalled();

  await act(async () => vi.advanceTimersByTimeAsync(4000));
  expect(router.replace).toHaveBeenCalledExactlyOnceWith('/sales-management/v2/pos?storeSlug=shop123');
  await act(async () => vi.advanceTimersByTimeAsync(4000));
  expect(fetch).toHaveBeenCalledTimes(4);
});

it('초대 조회에 로그인이 필요하면 초대 화면 복귀 주소를 전달한다', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ status: 'error', code: 'UNAUTHORIZED' }, { status: 401 })));
  await act(async () => render(<Page params={{ inviteCode: 'testcode' }} searchParams={{}} />));
  const destination = new URL(router.replace.mock.calls[0][0], 'http://test.local');
  expect(destination.pathname).toBe('/login');
  expect(destination.searchParams.get('callbackUrl')).toBe('/sales-management/v2/staff/join/testcode');
});

it('초대 조회의 404를 유효하지 않은 초대로 표시한다', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ status: 'error', code: 'NOT_FOUND' }, { status: 404 })));
  await act(async () => render(<Page params={{ inviteCode: 'testcode' }} searchParams={{}} />));
  expect(screen.getByRole('heading', { name: '유효하지 않은 링크입니다' })).toBeInTheDocument();
  expect(router.replace).not.toHaveBeenCalled();
});
