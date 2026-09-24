import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockLandingV2Service } from '@/lib/mocks/sales-management-landing-v2-service';
import SalesManagementV2Provider from '../SalesManagementV2Provider';
import ProductsPage from './ProductsPage';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }), useSearchParams: () => new URLSearchParams() }));
beforeEach(() => {
  push.mockReset();
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', ''); this.querySelector('button')?.focus(); } },
    close: { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open'); } },
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const change = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
async function ready({ form = false, count = 36, id }: { form?: boolean; count?: number; id?: string } = {}) {
  const service = createMockLandingV2Service('success', { catalog: true, productCount: count });
  const view = render(<SalesManagementV2Provider service={service}><ProductsPage form={form} productId={id} /></SalesManagementV2Provider>);
  if (form) await screen.findByLabelText('상품명'); else await screen.findByLabelText('상품 검색');
  return { service, view };
}

describe('상품 관리 v2 화면', () => {
  it('20개 경계, 검색과 카테고리 조합, 조건 변경 시 1페이지를 적용한다', async () => {
    await ready();
    const items = () => within(screen.getByRole('list', { name: '상품 목록' })).getAllByRole('listitem');
    expect(items()).toHaveLength(20);
    fireEvent.click(screen.getByRole('button', { name: '다음 페이지' })); expect(items()).toHaveLength(16);
    change('상품 검색', '가방'); expect(items()).toHaveLength(20);
    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(screen.getByRole('button', { name: '카테고리 필터' })); fireEvent.click(screen.getByRole('button', { name: '신발' }));
    expect(screen.getByText('검색 결과가 없습니다.')).toBeInTheDocument();
    change('상품 검색', ''); expect(items()).toHaveLength(3);
  });
  it('마지막 페이지의 삭제 취소·실패는 유지하고 성공하면 이전 페이지로 이동한다', async () => {
    const { service } = await ready({ count: 21 });
    fireEvent.click(screen.getByRole('button', { name: '다음 페이지' }));
    fireEvent.click(screen.getByRole('button', { name: '무슨무슨가방 삭제' })); fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect((await service.getProducts()).total).toBe(21);
    vi.spyOn(service, 'deleteProduct').mockRejectedValueOnce(new Error('failure'));
    fireEvent.click(screen.getByRole('button', { name: '무슨무슨가방 삭제' })); fireEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('처리하지 못했어요.');
    expect((await service.getProducts()).total).toBe(21);
    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(within(screen.getByRole('list', { name: '상품 목록' })).getAllByRole('listitem')).toHaveLength(20);
    expect(screen.queryByRole('navigation', { name: '페이지네이션' })).not.toBeInTheDocument();
  });
  it('빈 숫자·음수·소수를 거절하고 0은 허용하며 실패 후 입력을 보존한다', async () => {
    const { service } = await ready({ form: true, count: 0 });
    const submit = screen.getByRole('button', { name: '상품 등록하기' });
    change('상품명', '무료 샘플'); change('가격', '0'); expect(submit).toBeDisabled();
    for (const value of ['-1', '1.5', '']) { change('총재고', value); expect(submit).toBeDisabled(); }
    change('총재고', '0'); expect(submit).toBeEnabled();
    vi.spyOn(service, 'saveProduct').mockRejectedValueOnce(new Error('failure'));
    fireEvent.click(submit); fireEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument(); expect(screen.getByLabelText('상품명')).toHaveValue('무료 샘플');
    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByLabelText('상품명')).toHaveValue(''); expect(screen.getByText('NEW')).toBeInTheDocument();
    expect((await service.getSellerSummary()).productCount).toBe(1);
  });
  it('Enter 카테고리 생성, 옵션 합산·추가금·마지막 옵션 삭제를 처리한다', async () => {
    const { service } = await ready({ form: true, count: 0 });
    fireEvent.focus(screen.getByLabelText('카테고리')); change('카테고리 검색 및 생성', '새 분류'); fireEvent.keyDown(screen.getByLabelText('카테고리 검색 및 생성'), { key: 'Enter' });
    await screen.findByRole('button', { name: '카테고리 해제' });
    expect(await service.getCategories()).toContain('새 분류');
    change('상품명', '옵션 상품'); change('가격', '1000');
    fireEvent.click(screen.getByRole('radio', { name: '사용함' }));
    expect(screen.getByLabelText('추가금 1')).toHaveValue('0');
    change('옵션명 1', '빨강'); change('추가금 1', '200'); change('옵션 재고 1', '2');
    fireEvent.click(screen.getByRole('button', { name: '옵션 추가' }));
    change('옵션명 2', '파랑'); change('옵션 재고 2', '3');
    expect(screen.getByLabelText('총재고')).toHaveValue('5'); expect(screen.getByLabelText('총재고')).toHaveAttribute('readonly');
    fireEvent.click(screen.getByRole('button', { name: '상품 등록하기' })); fireEvent.click(screen.getByRole('button', { name: '확인' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect((await service.getProducts()).items[0]).toMatchObject({ price: 1000, stock: 5, category: '새 분류', options: [{ price: 200 }, { price: 0 }] });
    fireEvent.click(screen.getByRole('radio', { name: '사용함' })); fireEvent.click(screen.getByRole('button', { name: '옵션 1 삭제' }));
    expect(screen.getByRole('radio', { name: '사용안함' })).toBeChecked();
  });
  it('수정값을 채우고 순서와 수량을 유지하며 전체 상품으로 이동한다', async () => {
    const { service } = await ready({ form: true, id: 'landing-product-2', count: 3 });
    expect(screen.getByLabelText('상품명')).toHaveValue('무슨무슨가방');
    expect(screen.getByLabelText('가격')).toHaveValue('126,000');
    change('상품명', '이름 수정'); fireEvent.click(screen.getByRole('button', { name: '수정 완료' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/sales-management/v2/products'));
    expect((await service.getProducts()).items[1].name).toBe('이름 수정'); expect((await service.getProducts()).total).toBe(3);
    expect(screen.queryByText('NEW')).not.toBeInTheDocument();
  });
  it('이미지 파일을 미리보고 저장하며 등록 하단 목록은 페이지로 나누지 않는다', async () => {
    const { service } = await ready({ form: true, count: 21 });
    expect(within(screen.getByRole('list', { name: '상품 목록' })).getAllByRole('listitem')).toHaveLength(21);
    expect(screen.queryByRole('navigation', { name: '페이지네이션' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('상품 이미지 선택'), { target: { files: [new File(['image'], 'sample.png', { type: 'image/png' })] } });
    await waitFor(() => expect(screen.getByAltText('상품 이미지 미리보기')).toHaveAttribute('src', expect.stringContaining('data:image/png')));
    change('상품명', '이미지 상품'); change('가격', '1'); change('총재고', '1');
    fireEvent.click(screen.getByRole('button', { name: '상품 등록하기' })); fireEvent.click(screen.getByRole('button', { name: '확인' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect((await service.getProducts()).items[0].imageUrl).toContain('data:image/png');
  });
  it('처리 중 중복 등록을 막고 마지막 상품 삭제 시 빈 화면으로 전환한다', async () => {
    const { service } = await ready({ form: true, count: 0 });
    const originalSave = service.saveProduct;
    let release!: () => void;
    const saving = vi.spyOn(service, 'saveProduct').mockImplementation(async (...args) => {
      await new Promise<void>(resolve => { release = resolve; });
      return originalSave(...args);
    });
    change('상품명', '한 번만 등록'); change('가격', '0'); change('총재고', '0');
    fireEvent.click(screen.getByRole('button', { name: '상품 등록하기' }));
    const confirm = screen.getByRole('button', { name: '확인' });
    fireEvent.click(confirm); fireEvent.click(confirm); expect(confirm).toBeDisabled(); expect(saving).toHaveBeenCalledTimes(1);
    release(); await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect((await service.getProducts()).total).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: '한 번만 등록 삭제' })); fireEvent.click(screen.getByRole('button', { name: '확인' }));
    await screen.findByText('아직 상품이 등록되지 않았어요!'); expect((await service.getSellerSummary()).productCount).toBe(0);
  });
  it('수정 실패 시 입력과 저장된 데이터를 유지한다', async () => {
    const { service } = await ready({ form: true, id: 'landing-product-1', count: 1 });
    vi.spyOn(service, 'saveProduct').mockRejectedValueOnce(new Error('failure'));
    change('상품명', '수정 중인 이름'); fireEvent.click(screen.getByRole('button', { name: '수정 완료' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('수정하지 못했어요.');
    expect(screen.getByLabelText('상품명')).toHaveValue('수정 중인 이름');
    expect((await service.getProducts()).items[0].name).toBe('무슨무슨가방'); expect(push).not.toHaveBeenCalled();
  });

});
