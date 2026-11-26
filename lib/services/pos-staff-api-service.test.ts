import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPosStaffApiService, createPosStaffInviteApiService, getOperationalStoreRole } from './pos-staff-api-service';

function success(data: unknown) {
  return Response.json({ status: 'success', data });
}

afterEach(() => vi.unstubAllGlobals());

describe('POS 직원 API 서비스', () => {
  it('목록·승인·거절·삭제 요청에서 서버의 현재 패널을 반환한다', async () => {
    const snapshot = { pending: [], registered: [], inviteUrl: 'http://test.local/join/code' };
    const fetch = vi.fn(async () => success(snapshot));
    vi.stubGlobal('fetch', fetch);
    const service = createPosStaffApiService('/test');

    await expect(service.getStaff()).resolves.toEqual(snapshot);
    await expect(service.approve('id/1')).resolves.toEqual(snapshot);
    await expect(service.reject('id/2')).resolves.toEqual(snapshot);
    await expect(service.remove('id/3')).resolves.toEqual(snapshot);

    expect(fetch).toHaveBeenNthCalledWith(1, '/test/staff', expect.objectContaining({ cache: 'no-store' }));
    expect(fetch).toHaveBeenNthCalledWith(2, '/test/staff/id%2F1', expect.objectContaining({
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{"status":"APPROVED"}',
    }));
    expect(fetch).toHaveBeenNthCalledWith(3, '/test/staff/id%2F2', expect.objectContaining({ method: 'PATCH', body: '{"status":"REJECTED"}' }));
    expect(fetch).toHaveBeenNthCalledWith(4, '/test/staff/id%2F3', expect.objectContaining({ method: 'DELETE' }));
  });

  it('현장 운영 권한을 요청한 상점에서만 조회한다', async () => {
    const role = { role: 'STAFF', store: { storeId: 's1', name: '잇장샵', storeSlug: 'itjang' } };
    const fetch = vi.fn().mockResolvedValueOnce(success(null)).mockResolvedValueOnce(success(role));
    vi.stubGlobal('fetch', fetch);

    await expect(getOperationalStoreRole()).resolves.toBeNull();
    await expect(getOperationalStoreRole('itjang')).resolves.toEqual(role);

    expect(fetch).toHaveBeenNthCalledWith(1, '/api/v2/qrshop/staff/me', expect.any(Object));
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/v2/qrshop/staff/me?storeSlug=itjang', expect.any(Object));
  });

  it('범위가 지정된 상점이 없을 때만 404를 권한 없음으로 처리한다', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json({ status: 'error', code: 'NOT_FOUND' }, { status: 404 }))
      .mockResolvedValueOnce(Response.json({ status: 'error', code: 'NOT_FOUND' }, { status: 404 }));
    vi.stubGlobal('fetch', fetch);

    await expect(getOperationalStoreRole('other-shop')).resolves.toBeNull();
    await expect(getOperationalStoreRole()).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(1, '/api/v2/qrshop/staff/me?storeSlug=other-shop', expect.any(Object));
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/v2/qrshop/staff/me', expect.any(Object));
  });

  it('초대 상태와 승인 응답에서 해당 상점의 식별자를 가져온다', async () => {
    const invite = { status: 'none', store: { name: '잇장샵', imageUrl: null, storeSlug: 'itjang' } };
    const approval = { status: 'approved', storeSlug: 'itjang' };
    const fetch = vi.fn().mockResolvedValueOnce(success(invite)).mockResolvedValueOnce(success(approval));
    vi.stubGlobal('fetch', fetch);
    const service = createPosStaffInviteApiService('code/a');
    const { signal } = new AbortController();

    await expect(service.getInvite(signal)).resolves.toEqual(invite);
    await expect(service.requestAccess()).resolves.toEqual(approval);

    const path = '/api/v2/qrshop/staff/invite/code%2Fa';
    expect(fetch).toHaveBeenNthCalledWith(1, path, expect.objectContaining({ signal }));
    expect(fetch).toHaveBeenNthCalledWith(2, path, expect.objectContaining({ method: 'POST' }));
  });
});
