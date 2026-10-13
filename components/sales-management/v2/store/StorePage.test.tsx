import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockLandingV2Service, type LandingV2MockState } from '@/lib/mocks/sales-management-landing-v2-service';
import SalesManagementV2Provider from '../SalesManagementV2Provider';
import SalesManagementLandingV2 from '../SalesManagementLandingV2';
import StorePage from './StorePage';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }), useSearchParams: () => new URLSearchParams() }));
beforeEach(() => {
  push.mockReset();
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', ''); } },
    close: { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open'); } },
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const change = (label: string, value: string) => fireEvent.change(screen.getByRole('textbox', { name: label }), { target: { value } });
async function ready(state: LandingV2MockState = 'no-sales') {
  const service = createMockLandingV2Service(state);
  const view = render(<SalesManagementV2Provider service={service}><StorePage /></SalesManagementV2Provider>);
  await screen.findByRole('textbox', { name: '상점명' });
  return { service, view };
}

describe('v2 상점 수정·삭제', () => {
  it('기존 정보를 불러오고 QR을 유지하며 본인 아이디로 수정한 결과가 랜딩에 반영된다', async () => {
    const { service, view } = await ready('success');
    expect(screen.getByRole('textbox', { name: '상점명' })).toHaveValue('잇장샵');
    expect(screen.queryByRole('button', { name: '상점 삭제하기' })).not.toBeInTheDocument();
    expect(screen.getByAltText('방문객 주문 QR 코드 미리보기')).toBeInTheDocument();
    change('상점명', '바뀐 상점');
    fireEvent.click(screen.getByRole('button', { name: '상점 정보 수정하기' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: '상점명' })).toHaveAttribute('readonly'));
    expect(screen.getByLabelText('방문객 주문 URL')).toHaveValue((await service.getStore())!.visitorOrderUrl);
    view.rerender(<SalesManagementV2Provider service={service}><SalesManagementLandingV2 /></SalesManagementV2Provider>);
    expect(await screen.findByRole('heading', { name: '바뀐 상점' })).toBeInTheDocument();
  });
  it('아이디 검증·중복 확인 후 등록하고 수정 중에도 QR 영역을 유지한다', async () => {
    await ready('empty');
    change('상점명', '새 상점'); change('상점 아이디', 'abc');
    fireEvent.click(screen.getByRole('button', { name: '상점 등록하기' }));
    expect(screen.getByText('영문 소문자와 숫자로 4~20자 입력해주세요.')).toBeInTheDocument();
    change('상점 아이디', 'taken123'); fireEvent.click(screen.getByRole('button', { name: '중복 확인' }));
    expect(await screen.findByText('중복된 아이디입니다.')).toBeInTheDocument();
    change('상점 아이디', 'myshop123'); fireEvent.click(screen.getByRole('button', { name: '중복 확인' }));
    await screen.findByRole('img', { name: '사용 가능한 아이디' });
    fireEvent.click(screen.getByRole('button', { name: '상점 등록하기' }));
    await screen.findByLabelText('방문객 주문 URL');
    fireEvent.click(screen.getByRole('button', { name: '상점 정보 수정하기' }));
    expect(screen.getByRole('textbox', { name: '상점명' })).not.toHaveAttribute('readonly');
    expect(screen.getByLabelText('방문객 주문 URL')).toBeInTheDocument();
  });
  it('삭제 취소·실패 시 상태를 유지하고 재시도 성공 시 연결 상품까지 비운다', async () => {
    const { service, view } = await ready();
    fireEvent.click(screen.getByRole('button', { name: '상점 삭제하기' }));
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect((await service.getProducts()).total).toBe(36);
    const remove = vi.spyOn(service, 'deleteStore').mockRejectedValueOnce(new Error('삭제 실패'));
    fireEvent.click(screen.getByRole('button', { name: '상점 삭제하기' }));
    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('삭제 실패');
    expect((await service.getProducts()).total).toBe(36);
    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/sales-management/v2'));
    expect(remove).toHaveBeenCalledTimes(2);
    view.rerender(<SalesManagementV2Provider service={service}><SalesManagementLandingV2 /></SalesManagementV2Provider>);
    expect(await screen.findByText('아직 상점이 등록되지 않았어요!')).toBeInTheDocument();
    expect(screen.getByText('0개')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: '최근 등록 상품' })).not.toBeInTheDocument();
  });
  it('삭제 처리 중 중복 클릭과 Escape 취소를 막는다', async () => {
    const { service } = await ready();
    let resolve!: () => void;
    const remove = vi.spyOn(service, 'deleteStore').mockImplementation(() => new Promise<void>(done => { resolve = done; }));
    fireEvent.click(screen.getByRole('button', { name: '상점 삭제하기' }));
    const confirm = screen.getByRole('button', { name: '확인' });
    fireEvent.click(confirm); fireEvent.click(confirm);
    expect(confirm).toBeDisabled(); expect(screen.getByRole('button', { name: '취소' })).toBeDisabled();
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(screen.getByRole('dialog')).toBeInTheDocument(); expect(remove).toHaveBeenCalledTimes(1);
    await act(async () => resolve());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('중복 확인 응답이 늦게 와도 이후 입력을 확인된 아이디로 처리하지 않는다', async () => {
    const { service } = await ready('empty');
    let resolve!: (value: boolean) => void;
    vi.spyOn(service, 'checkStoreIdentifier').mockImplementation(() => new Promise<boolean>(done => { resolve = done; }));
    const save = vi.spyOn(service, 'saveStore');
    change('상점명', '새 상점'); change('상점 아이디', 'first123');
    fireEvent.click(screen.getByRole('button', { name: '중복 확인' }));
    change('상점 아이디', 'second123');
    await act(async () => resolve(true));
    fireEvent.click(screen.getByRole('button', { name: '상점 등록하기' }));
    expect(screen.getByText('상점 아이디 중복 확인을 해주세요.')).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });
  it('QA: 상점명 지우기와 아이디 오류·성공 상태를 표시한다', async () => {
    await ready('empty');
    change('상점명', '새 상점');
    fireEvent.click(screen.getByRole('button', { name: '상점명 지우기' }));
    expect(screen.getByRole('textbox', { name: '상점명' })).toHaveValue('');
    change('상점 아이디', 'taken123');
    fireEvent.click(screen.getByRole('button', { name: '중복 확인' }));
    await screen.findByText('중복된 아이디입니다.');
    expect(screen.getByRole('img', { name: '아이디 확인 오류' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '상점 등록하기' })).toBeDisabled();
    change('상점 아이디', 'myshop123');
    fireEvent.click(screen.getByRole('button', { name: '중복 확인' }));
    await screen.findByRole('img', { name: '사용 가능한 아이디' });
    expect(screen.getByText('4자 이상 영문 소문자 / 숫자 조합')).toBeInTheDocument();
  });
  it('QA: 상점 QR에서 저장과 인쇄를 열고 실패 후 재시도한다', async () => {
    const { service } = await ready();
    vi.spyOn(service, 'getVisitorOrderQr').mockRejectedValueOnce(new Error('failure'));
    fireEvent.click(screen.getByRole('button', { name: '방문객 주문 QR 열기' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('QR을 불러오지 못했어요.');
    fireEvent.click(screen.getByRole('button', { name: '방문객 주문 QR 열기' }));
    await screen.findByRole('dialog', { name: '방문객 주문 QR' });
    expect(screen.getByRole('button', { name: '인쇄' })).toBeDisabled();
    fireEvent.load(screen.getByAltText('방문객 주문 QR 코드'));
    expect(await screen.findByRole('link', { name: '이미지 저장' })).toHaveAttribute('download', '방문객-주문-QR.png');
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    fireEvent.click(screen.getByRole('button', { name: '인쇄' }));
    expect(print).toHaveBeenCalledOnce();
  });

});
