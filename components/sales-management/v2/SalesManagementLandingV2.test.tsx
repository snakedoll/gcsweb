import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockLandingV2Service } from '@/lib/mocks/sales-management-landing-v2-service';
import SalesManagementLandingV2 from './SalesManagementLandingV2';

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value: function (this: HTMLDialogElement) {
      this.setAttribute('open', ''); this.querySelector('button')?.focus();
    } },
    close: { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open'); } },
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

async function ready(service = createMockLandingV2Service()) {
  render(<SalesManagementLandingV2 service={service} />);
  await screen.findByRole('heading', { name: '잇장샵' });
  return service;
}

describe('판매관리 랜딩 v2', () => {
  it('상점 미등록 시 상점 등록만 안내하고 바로가기를 제한한다', async () => {
    render(<SalesManagementLandingV2 mockState="empty" />);
    expect(await screen.findByRole('link', { name: '상점 등록 하러가기' })).toHaveAttribute('href', '/sales-management/store');
    expect(screen.queryByRole('link', { name: '상품 등록 하러가기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'QR 발급받기' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /현장 포스/ }));
    expect(screen.getByRole('status')).toHaveTextContent('해당 기능은 상점/상품 등록 후 이용 가능합니다.');
  });

  it('상점만 등록되어도 QR은 허용하고 바로가기는 상품 등록까지 제한한다', async () => {
    await ready(createMockLandingV2Service('store-only'));
    expect(screen.getByRole('link', { name: '상품 등록 하러가기' })).toHaveAttribute('href', '/sales-management/products');
    fireEvent.click(screen.getByRole('button', { name: /데이터 관리/ }));
    expect(screen.getByRole('status')).toHaveTextContent('해당 기능은 상품 등록 후 이용 가능합니다.');
    fireEvent.click(screen.getByRole('button', { name: 'QR 발급받기' }));
    expect(await screen.findByRole('dialog', { name: '방문객 주문 QR' })).toBeInTheDocument();
  });

  it('등록 상태의 통계와 최근 상품을 표시하고 미구현 메뉴는 준비 중으로 안내한다', async () => {
    await ready();
    expect(screen.getByText('36개')).toBeInTheDocument();
    expect(screen.getByText('128,000원')).toBeInTheDocument();
    expect(screen.getByText('128건')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: '최근 등록 상품' })).getAllByRole('listitem')).toHaveLength(6);
    fireEvent.click(screen.getByRole('button', { name: /주문 관리/ }));
    expect(screen.getByRole('status')).toHaveTextContent('준비 중입니다.');
  });

  it('삭제 취소는 데이터를 유지하고 확인하면 목록·상품 수를 갱신한다', async () => {
    const service = await ready();
    const deleteProduct = vi.spyOn(service, 'deleteProduct');
    fireEvent.click(screen.getAllByRole('button', { name: '무슨무슨시계 삭제' })[0]);
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(deleteProduct).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('button', { name: '무슨무슨시계 삭제' })[0]);
    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(await screen.findByText('35개')).toBeInTheDocument();
    expect(deleteProduct).toHaveBeenCalledWith('landing-product-1');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('마지막 상품 삭제 시 빈 화면으로 전환하고 바로가기를 제한한다', async () => {
    await ready(createMockLandingV2Service('success', { productCount: 1 }));
    fireEvent.click(screen.getByRole('button', { name: '무슨무슨시계 삭제' }));
    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(await screen.findByRole('link', { name: '상품 등록 하러가기' })).toBeInTheDocument();
    expect(screen.getByText('0개')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /현장 포스/ }));
    expect(screen.getByRole('status')).toHaveTextContent('해당 기능은 상품 등록 후 이용 가능합니다.');
  });

  it('삭제 실패 시 모달과 기존 상품을 유지하고 재시도할 수 있다', async () => {
    const service = await ready();
    vi.spyOn(service, 'deleteProduct').mockRejectedValueOnce(new Error('failure'));
    fireEvent.click(screen.getAllByRole('button', { name: '무슨무슨시계 삭제' })[0]);
    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('상품을 삭제하지 못했어요.');
    expect(screen.getByText('36개')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(await screen.findByText('35개')).toBeInTheDocument();
  });

  it('상품 두 칸을 이동하고 끝에서는 이동 버튼을 비활성화한다', async () => {
    await ready();
    const list = screen.getByRole('list', { name: '최근 등록 상품' });
    Object.defineProperties(list, { clientWidth: { value: 978 }, scrollWidth: { value: 2238 } });
    Object.defineProperty(list.firstElementChild, 'offsetWidth', { value: 353 });
    const scrollTo = vi.fn(); list.scrollTo = scrollTo;
    list.style.columnGap = '24px';
    fireEvent.scroll(list);
    fireEvent.click(screen.getByRole('button', { name: '다음 상품 보기' }));
    expect(scrollTo).toHaveBeenCalledWith({ left: 754, behavior: 'smooth' });
    list.scrollLeft = 1260; fireEvent.scroll(list);
    expect(screen.getByRole('button', { name: '다음 상품 보기' })).toBeDisabled();
  });

  it('프로필 이미지 선택을 서비스에 전달하고 이미지를 갱신한다', async () => {
    const service = await ready(createMockLandingV2Service('no-image'));
    const update = vi.spyOn(service, 'updateStoreImage');
    const file = new File(['image'], 'shop.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('상점 이미지 파일'), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByAltText('잇장샵 상점 이미지')).toHaveAttribute('src', expect.stringContaining('data:image/png')));
    expect(update).toHaveBeenCalledWith(file);
  });

  it('QR URL 복사와 실패 안내를 제공하고 Escape로 닫으면 포커스를 복귀한다', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', Object.create(navigator, { clipboard: { value: { writeText } } }));
    await ready();
    const trigger = screen.getByRole('button', { name: 'QR 발급받기' });
    trigger.focus(); fireEvent.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: '방문객 주문 QR' });
    const url = screen.getByRole('textbox', { name: '방문객 주문 URL' }) as HTMLInputElement;
    expect(url.value).toContain('/QRshop/v2?store=');
    fireEvent.click(screen.getByRole('button', { name: '방문객 주문 URL 복사' }));
    expect(await within(dialog).findByRole('status')).toHaveTextContent('복사했어요.');
    expect(writeText).toHaveBeenCalledWith(url.value);
    writeText.mockRejectedValueOnce(new Error('denied'));
    fireEvent.click(screen.getByRole('button', { name: '방문객 주문 URL 복사' }));
    await waitFor(() => expect(within(dialog).getByRole('status')).toHaveTextContent('직접 선택해 복사해주세요.'));
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });

  it('QR 이미지가 로드되면 다운로드와 인쇄를 제공한다', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    await ready(); fireEvent.click(screen.getByRole('button', { name: 'QR 발급받기' }));
    const image = await screen.findByAltText('방문객 주문 QR 코드');
    fireEvent.load(image);
    const download = await screen.findByRole('link', { name: '이미지 저장' });
    expect(download).toHaveAttribute('href', '/assets/sales-management/v2/visitor-order-qr.png');
    expect(download).toHaveAttribute('download', '방문객-주문-QR.png');
    fireEvent.click(screen.getByRole('button', { name: '인쇄' }));
    expect(print).toHaveBeenCalledOnce();
  });

  it('QR 조회 실패를 안내하고 기존 화면을 유지한다', async () => {
    const service = await ready();
    vi.spyOn(service, 'getVisitorOrderQr').mockRejectedValueOnce(new Error('failure'));
    fireEvent.click(screen.getByRole('button', { name: 'QR 발급받기' }));
    expect(await screen.findByRole('status')).toHaveTextContent('QR 정보를 불러오지 못했어요.');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('조회 중 로딩을 표시하고 오류 시 v2 재진입 링크를 제공한다', async () => {
    render(<SalesManagementLandingV2 mockState="error" />);
    expect(screen.getByRole('status', { name: '판매 관리 정보를 불러오는 중' })).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('판매 관리 정보를 불러오지 못했어요.');
    expect(screen.getByRole('link', { name: '다시 불러오기' })).toHaveAttribute('href', '/sales-management/v2');
  });
});
