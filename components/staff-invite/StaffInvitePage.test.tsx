import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Page from '@/app/staff-invite/[token]/page';
import JoinPage from '@/app/sales-management/v2/staff/join/[inviteCode]/page';
import { MOCK_STAFF_REQUEST_ID, readMockStaffInviteRequest, requestMockStaffInvite } from '@/lib/mocks/pos-staff-invite-service';
import { createMockPosStaffService } from '@/lib/mocks/pos-staff-service';

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  replace.mockClear();
  vi.restoreAllMocks();
});

describe('직원 등록 요청', () => {
  it('알 수 없는 링크에서 안내를 표시하고 요청이나 이동을 시작하지 않는다', () => {
    render(<Page params={{ token: 'invalid' }} searchParams={{}} />);
    expect(screen.getByRole('heading', { name: '유효하지 않은 링크입니다' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /권한 요청/ })).not.toBeInTheDocument();
    expect(readMockStaffInviteRequest()).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it('보내는 중 중복을 막고 모의 실패 뒤 재시도할 수 있다', async () => {
    render(<JoinPage params={{ inviteCode: 'demo' }} searchParams={{ preview: 'error' }} />);
    expect(screen.getByRole('heading', { name: '직원 등록을 요청합니다' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '권한 요청하기' }));
    expect(screen.getByRole('button', { name: '권한 요청중입니다' })).toBeDisabled();
    expect(await screen.findByRole('alert')).toHaveTextContent('요청을 보내지 못했습니다. 다시 시도해주세요.');
    expect(readMockStaffInviteRequest()).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '권한 요청하기' }));
    expect(await screen.findByRole('heading', { name: '승인을 기다리고 있습니다' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('요청을 보냈습니다');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('다시 열어도 승인 대기를 유지하고 승인되면 현장 운영으로 한 번 이동한다', async () => {
    await requestMockStaffInvite();
    const owner = createMockPosStaffService();
    render(<Page params={{ token: 'demo' }} searchParams={{}} />);
    expect(screen.getByRole('heading', { name: '승인을 기다리고 있습니다' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /권한 요청/ })).not.toBeInTheDocument();
    await act(async () => { await owner.approve(MOCK_STAFF_REQUEST_ID); });
    await waitFor(() => expect(replace).toHaveBeenCalledExactlyOnceWith('/sales-management/v2/pos'));
  });

  it('거절된 요청의 상태를 알리고 새 요청을 보낼 수 있다', async () => {
    await requestMockStaffInvite();
    const owner = createMockPosStaffService();
    render(<Page params={{ token: 'demo' }} searchParams={{}} />);
    await act(async () => { await owner.reject(MOCK_STAFF_REQUEST_ID); });
    expect(screen.getByRole('status')).toHaveTextContent('이전 요청을 거절했습니다');
    fireEvent.click(screen.getByRole('button', { name: '권한 요청하기' }));
    expect(await screen.findByRole('heading', { name: '승인을 기다리고 있습니다' })).toBeInTheDocument();
    expect((await owner.getStaff()).pending.filter(member => member.id === MOCK_STAFF_REQUEST_ID)).toHaveLength(1);
    expect(replace).not.toHaveBeenCalled();
  });
});
