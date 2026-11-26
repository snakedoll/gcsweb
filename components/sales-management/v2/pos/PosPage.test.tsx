import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockPosService } from '@/lib/mocks/pos-service';
import type { PosReceipt } from '@/lib/services/pos-service';
import type { SalesProduct } from '@/types/sales-management';
import PosPage from './PosPage';

beforeEach(() => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', ''); } },
    close: { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open'); } },
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); window.localStorage.clear(); });

function setup(empty = false) {
  const items: SalesProduct[] = empty ? [] : [
    { id: 'postcard', storeId: 'store', name: '부산 엽서', category: '엽서', price: 3000, stock: 2, options: [], isVisible: true, hasSalesHistory: false },
    { id: 'keyring', storeId: 'store', name: '고양이 키링', category: '키링', price: 5000, stock: 3,
      options: [{ id: 'black', name: '검정', price: 1000, stock: 2 }, { id: 'white', name: '흰색', price: 0, stock: 1 }, { id: 'red', name: '빨강', price: 0, stock: 0 }], isVisible: true, hasSalesHistory: false },
    { id: 'soldout', storeId: 'store', name: '품절 엽서', category: '엽서', price: 3000, stock: 0, options: [], isVisible: true, hasSalesHistory: false },
    { id: 'five', storeId: 'store', name: '재고 임계 상품', category: '엽서', price: 3000, stock: 5, options: [], isVisible: true, hasSalesHistory: false },
    { id: 'six', storeId: 'store', name: '일반 재고 상품', category: '엽서', price: 3000, stock: 6, options: [], isVisible: true, hasSalesHistory: false },
  ];
  return { items, service: createMockPosService({ getProducts: async () => ({ items, total: items.length, newestProductId: null }) }) };
}

async function ready(service = setup().service, accountId?: string) {
  render(<PosPage service={service} accountId={accountId} />);
  await screen.findByRole('list', { name: 'POS 상품 목록' });
  return service;
}
const postcard = () => screen.getByRole('button', { name: '부산 엽서, 재고 2개' });
const amount = () => screen.getByLabelText('결제 금액');
const selected = () => screen.getByRole('list', { name: '선택 상품' });

describe('POS 기본 화면', () => {
  it('5개까지는 재고 부족으로 표시하고 6개와 품절을 구분한다', async () => {
    await ready();
    const low = screen.getByRole('button', { name: '재고 임계 상품, 재고 5개' });
    expect(low).toHaveAttribute('data-low-stock', 'true');
    expect(low).toBeEnabled();
    expect(screen.getByRole('button', { name: '일반 재고 상품, 재고 6개' })).toHaveAttribute('data-low-stock', 'false');
    const soldOut = screen.getByRole('button', { name: '품절 엽서, 재고 0개, 품절' });
    expect(soldOut).toHaveAttribute('data-low-stock', 'false');
    expect(soldOut).toBeDisabled();
  });

  it('카테고리·품절·선택수·수량·제거·합계와 재고 제한을 연결한다', async () => {
    await ready();
    expect(screen.getByRole('button', { name: /품절 엽서,/ })).toBeDisabled();
    fireEvent.click(within(screen.getByRole('group', { name: '상품 카테고리' })).getByRole('button', { name: '키링' }));
    expect(screen.queryByRole('button', { name: /부산 엽서,/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '전체' }));
    fireEvent.click(postcard());
    expect(amount()).toHaveTextContent('3,000원');
    expect(screen.getByLabelText('선택 1개')).toBeInTheDocument();
    fireEvent.click(within(selected()).getByRole('button', { name: '수량 늘리기' }));
    expect(amount()).toHaveTextContent('6,000원');
    fireEvent.click(postcard());
    expect(screen.getByRole('status')).toHaveTextContent('남은 재고수');
    expect(amount()).toHaveTextContent('6,000원');
    fireEvent.click(within(selected()).getByRole('button', { name: '수량 줄이기' }));
    expect(amount()).toHaveTextContent('3,000원');
    fireEvent.click(within(selected()).getByRole('button', { name: /제거/ }));
    expect(screen.getByText('상품을 선택해주세요')).toBeInTheDocument();
    expect(amount()).toHaveTextContent('0원');
    fireEvent.click(postcard());
    fireEvent.click(within(selected()).getByRole('button', { name: '수량 줄이기' }));
    expect(screen.queryByRole('list', { name: '선택 상품' })).not.toBeInTheDocument();
  });

  it('옵션을 고르면 장바구니에 바로 담기고 옵션창을 닫아도 유지된다', async () => {
    await ready();
    const trigger = screen.getByRole('button', { name: /고양이 키링,/ });
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: '고양이 키링' });
    expect(within(dialog).getByRole('button', { name: /빨강/ })).toBeDisabled();
    const black = within(dialog).getByRole('button', { name: /검정/ });
    expect(black).toHaveTextContent('+ 1,000원');
    fireEvent.click(black);
    expect(amount()).toHaveTextContent('6,000원');
    expect(within(black).getByLabelText('선택 1개')).toBeInTheDocument();
    const white = within(dialog).getByRole('button', { name: /흰색/ });
    fireEvent.click(white);
    expect(white).toBeDisabled();
    expect(within(selected()).getAllByRole('listitem')).toHaveLength(2);
    expect(amount()).toHaveTextContent('11,000원');
    fireEvent.click(within(selected()).getAllByRole('button', { name: '수량 늘리기' })[1]);
    expect(screen.getByRole('status')).toHaveTextContent('남은 재고수');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(amount()).toHaveTextContent('11,000원');
  });

  it('선택 상품의 할인 한도를 확인하고 할인 금액을 주문 합계와 영수증에 반영한다', async () => {
    const service = await ready();
    const discount = screen.getByRole('button', { name: '할인' });
    expect(discount).toBeDisabled();
    fireEvent.click(postcard());
    fireEvent.click(screen.getByRole('button', { name: '일반 재고 상품, 재고 6개' }));
    fireEvent.click(discount);
    fireEvent.click(screen.getByRole('checkbox', { name: '부산 엽서 할인 선택' }));
    const input = screen.getByRole('textbox', { name: '할인 금액' });
    const apply = screen.getByRole('button', { name: '적용' });
    fireEvent.click(screen.getByRole('checkbox', { name: '일반 재고 상품 할인 선택' }));
    fireEvent.change(input, { target: { value: '3,001' } });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('각 상품 줄의 금액을 초과');
    expect(apply).toBeDisabled();
    fireEvent.change(input, { target: { value: '1,000' } });
    fireEvent.click(apply);
    expect(screen.queryByRole('form', { name: '할인 적용' })).not.toBeInTheDocument();
    expect(amount()).toHaveTextContent('4,000원');
    expect(screen.getByText('기존 금액 : 6,000원 / 할인 금액 : 2,000원')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '할인' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '카드' }));
    fireEvent.click(screen.getByRole('button', { name: '결제완료' }));
    expect(await screen.findByRole('dialog', { name: 'Mock 결제완료' })).toHaveTextContent('4,000원');
    expect(await service.getReceipts()).toMatchObject([{ totalAmount: 4000, lines: [{ discountAmount: 1000 }, { discountAmount: 1000 }] }]);
  });

  it('상품을 다시 누르거나 수량을 바꾸면 해당 줄 할인만 지운다', async () => {
    await ready();
    fireEvent.click(postcard());
    const regular = screen.getByRole('button', { name: '일반 재고 상품, 재고 6개' });
    fireEvent.click(regular);
    fireEvent.click(screen.getByRole('button', { name: '할인' }));
    for (const choice of screen.getAllByRole('checkbox')) fireEvent.click(choice);
    fireEvent.change(screen.getByRole('textbox', { name: '할인 금액' }), { target: { value: '1000' } });
    fireEvent.click(screen.getByRole('button', { name: '적용' }));
    fireEvent.click(postcard());
    expect(amount()).toHaveTextContent('8,000원');
    fireEvent.click(screen.getByRole('button', { name: '할인' }));
    expect(screen.getByRole('checkbox', { name: '일반 재고 상품 할인 선택' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    const regularQty = within(selected()).getByRole('group', { name: /일반 재고 상품 수량/ });
    fireEvent.click(within(regularQty).getByRole('button', { name: '수량 늘리기' }));
    expect(amount()).toHaveTextContent('12,000원');
  });

  it('결제 중 품절된 상품과 옵션만 안내하고 남은 상품의 구매를 다시 요청할 수 있다', async () => {
    const { items, service } = setup();
    await ready(service);
    fireEvent.click(postcard());
    fireEvent.click(screen.getByRole('button', { name: '일반 재고 상품, 재고 6개' }));
    fireEvent.click(screen.getByRole('button', { name: /고양이 키링, 재고/ }));
    fireEvent.click(screen.getByRole('button', { name: /검정/ }));
    fireEvent.keyDown(window, { key: 'Escape' });
    items[0].stock = 0;
    items[1].options[0].stock = 0;
    fireEvent.click(screen.getByRole('button', { name: '현금' }));
    fireEvent.click(screen.getByRole('button', { name: '결제완료' }));
    expect(await screen.findByText('부산 엽서 / 고양이 키링(검정)가 품절되었습니다. 해당 상품은 자동으로 제외됩니다.')).toBeInTheDocument();
    expect(within(selected()).getAllByRole('listitem')).toHaveLength(1);
    expect(selected()).toHaveTextContent('일반 재고 상품');
    expect(amount()).toHaveTextContent('3,000원');
    expect(await service.getReceipts()).toEqual([]);
    await waitFor(() => expect(screen.getByRole('button', { name: '결제완료' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '결제완료' }));
    expect(await screen.findByRole('dialog', { name: 'Mock 결제완료' })).toHaveTextContent('3,000원');
  });

  it.each(['카드', '현금', '계좌이체'])('%s 선택 후 Mock 결제완료·재고 갱신·장바구니 초기화를 처리한다', async label => {
    await ready();
    const complete = screen.getByRole('button', { name: '결제완료' });
    expect(complete).toBeDisabled();
    fireEvent.click(postcard());
    expect(complete).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(complete);
    const receipt = await screen.findByRole('dialog', { name: 'Mock 결제완료' });
    expect(receipt).toHaveTextContent('주문번호 001');
    expect(receipt).toHaveTextContent(`${label} · 3,000원`);
    expect(receipt).toHaveTextContent('실제 결제·주문 및 재고에는 반영되지 않습니다.');
    const confirm = within(receipt).getByRole('button', { name: '확인' });
    await waitFor(() => expect(confirm).toBeEnabled());
    fireEvent.click(confirm);
    expect(amount()).toHaveTextContent('0원');
    expect(complete).toBeDisabled();
    expect(screen.getByRole('button', { name: '부산 엽서, 재고 1개' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'false');
  });

  it('처리 중 중복 요청을 막고 실패하면 수량·결제수단을 보존해 재시도한다', async () => {
    const { service } = setup();
    let reject!: (reason: Error) => void;
    const completeSale = vi.spyOn(service, 'completeSale').mockImplementationOnce(() => new Promise<PosReceipt>((_, rejectSale) => { reject = rejectSale; }));
    await ready(service);
    fireEvent.click(postcard());
    fireEvent.click(screen.getByRole('button', { name: '현금' }));
    const complete = screen.getByRole('button', { name: '결제완료' });
    fireEvent.click(complete); fireEvent.click(complete);
    expect(completeSale).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: '처리 중' })).toBeDisabled();
    expect(within(selected()).getByRole('button', { name: '수량 늘리기' })).toBeDisabled();
    reject(new Error('완료 처리 실패'));
    expect(await screen.findByRole('status')).toHaveTextContent('완료 처리 실패');
    await waitFor(() => expect(screen.getByRole('button', { name: '결제완료' })).toBeEnabled());
    expect(amount()).toHaveTextContent('3,000원');
    expect(screen.getByRole('button', { name: '현금' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: '결제완료' }));
    expect(await screen.findByRole('dialog', { name: 'Mock 결제완료' })).toBeInTheDocument();
    expect(completeSale).toHaveBeenCalledTimes(2);
  });

  it('QR shop의 최초 도움말·Mock 토글과 직원 관리 진입을 제공한다', async () => {
    await ready(setup().service, 'pos-help-controls');
    expect(screen.getByRole('note')).toHaveTextContent('토글을 누르면 QR샵을 오픈');
    const toggle = screen.getByRole('switch', { name: 'QR shop' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'QR shop 도움말' }));
    expect(screen.getByRole('note')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '직원 관리' })).toBeEnabled();
    expect(screen.getByRole('link', { name: '편집' })).toHaveAttribute('href', '/sales-management/v2/pos/edit');
    const menu = screen.getByRole('button', { name: '현장 포스' });
    fireEvent.click(menu);
    const links = within(screen.getByRole('navigation', { name: '현장 운영 화면' })).getAllByRole('link');
    expect(links.map(link => [link.textContent, link.getAttribute('href')])).toEqual([
      ['전체 주문 조회', '/sales-management/v2/orders'],
      ['주문서 보드', '/sales-management/v2/pos/order-board'],
    ]);
    links[0].focus();
    fireEvent.keyDown(links[0], { key: 'Escape' });
    expect(menu).toHaveFocus();
    expect(menu).toHaveAttribute('aria-expanded', 'false');
  });

  it('QR shop 도움말을 계정마다 최초 한 번 표시하고 자동으로 닫는다', async () => {
    const { service } = setup();
    const view = render(<PosPage service={service} accountId="first-help-test" />);
    await screen.findByRole('list', { name: 'POS 상품 목록' });
    expect(screen.getByRole('note')).toBeVisible();
    view.unmount();
    vi.useFakeTimers();
    const secondView = render(<PosPage service={service} accountId="first-help-test" />);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    await act(async () => secondView.rerender(<PosPage service={service} accountId="other-help-test" />));
    expect(screen.getByRole('note')).toBeVisible();
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('빈 catalog와 조회 실패·재시도 상태를 제공한다', async () => {
    const { service } = setup(true);
    vi.spyOn(service, 'getCatalog').mockRejectedValueOnce(new Error('failure'));
    render(<PosPage service={service} />);
    expect(screen.getByRole('status')).toHaveTextContent('불러오는 중');
    expect(await screen.findByRole('alert')).toHaveTextContent('불러오지 못했어요');
    fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }));
    expect(await screen.findByText('노출 중인 상품이 없습니다.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '상품 관리로 이동' })).toHaveAttribute('href', '/sales-management/v2/products');
    expect(screen.getByRole('button', { name: '결제완료' })).toBeDisabled();
  });
});
