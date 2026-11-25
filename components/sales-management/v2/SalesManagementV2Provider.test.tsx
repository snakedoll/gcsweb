import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createStoreApiService } from '@/lib/services/sales-management-store-api-service';
import { createMockLandingV2Service } from '@/lib/mocks/sales-management-landing-v2-service';
import SalesManagementV2Provider from './SalesManagementV2Provider';
import { usePosSession } from './pos/PosProvider';
import type { PosStaffService } from '@/lib/services/pos-staff-service';

const route = vi.hoisted(() => ({ pathname: '/sales-management/v2/pos', search: '' }));
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname, useSearchParams: () => new URLSearchParams(route.search) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); route.search = ''; });
it.each(['/sales-management/v2/pos/order-board', '/sales-management/v2/analytics'])('API의 %s에서는 준비 상태를 표시한다', pathname => {
  route.pathname = pathname;
  render(<SalesManagementV2Provider service={createStoreApiService()}><p>판매 화면</p></SalesManagementV2Provider>);
  expect(screen.queryByText('판매 화면')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('연동은 준비 중이에요.');
});

it.each(['/sales-management/v2/pos', '/sales-management/v2/pos/edit', '/sales-management/v2/pos/add', '/sales-management/v2/orders'])(
  'API의 %s에서 지정한 상점까지 권한과 서비스가 연결된다', async pathname => {
    route.pathname = pathname;
    route.search = 'storeSlug=staffshop';
    const fetcher = vi.fn().mockImplementation(() => Response.json({ status: 'success', data: {
      role: 'STAFF', store: { storeId: 'store1', name: '직원 상점', storeSlug: 'staffshop' },
    } }));
    vi.stubGlobal('fetch', fetcher);
    function Probe() {
      const session = usePosSession();
      return <p>{session?.role}/{session?.storeSlug}/{session?.service.dataSource}/{session?.ordersService?.dataSource}</p>;
    }
    render(<SalesManagementV2Provider service={createStoreApiService()}><Probe /></SalesManagementV2Provider>);
    await waitFor(() => expect(screen.getByText('STAFF/staffshop/api/api')).toBeInTheDocument());
    expect(fetcher).toHaveBeenCalledWith('/api/v2/qrshop/staff/me?storeSlug=staffshop', expect.anything());
  }
);

it('Mock 모드 POS는 기존대로 열린다', () => {
  route.pathname = '/sales-management/v2/pos';
  render(<SalesManagementV2Provider service={createMockLandingV2Service()}><p>POS 판매 화면</p></SalesManagementV2Provider>);
  expect(screen.getByText('POS 판매 화면')).toBeInTheDocument();
});

it('Mock POS와 주문조회 이동 시 같은 직원 Service를 유지한다', async () => {
  const service = createMockLandingV2Service();
  let staff: PosStaffService | undefined;
  function Probe() { staff = usePosSession()?.staffService; return <p>운영 화면</p>; }
  route.pathname = '/sales-management/v2/pos';
  const view = render(<SalesManagementV2Provider service={service}><Probe /></SalesManagementV2Provider>);
  const original = staff!;
  const before = await original.getStaff();
  await original.approve(before.pending[0].id);
  route.pathname = '/sales-management/v2/orders';
  view.rerender(<SalesManagementV2Provider service={service}><Probe /></SalesManagementV2Provider>);
  expect(staff).toBe(original);
  expect((await staff!.getStaff()).pending).toHaveLength(before.pending.length - 1);
});
