import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { createMockProductAnalyticsService } from '@/lib/mocks/product-analytics-service';
import { ProductAnalyticsScreen } from './ProductAnalyticsPage';

const productTable = () => screen.getByRole('table', { name: '상품 및 카테고리 분석' });

beforeEach(() => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', ''); } },
    close: { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open'); } },
  });
});

afterEach(cleanup);

it('날짜와 상품 집계 기준을 바꾸고 남은 행을 펼친다', () => {
  render(<ProductAnalyticsScreen service={createMockProductAnalyticsService()} />);
  expect(within(productTable()).getByText('27개')).toBeInTheDocument();
  expect(within(productTable()).getByText('9.7%')).toBeInTheDocument();
  expect(within(productTable()).queryByText('미니 프린트')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '더보기 (2개)' }));
  expect(within(productTable()).getByText('미니 프린트')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '10.08 (목)' }));
  expect(within(productTable()).getByText('7개')).toBeInTheDocument();
  expect(within(productTable()).queryByText('미니 프린트')).not.toBeInTheDocument();
  expect(within(screen.getByRole('table', { name: '많이 팔린 조합 상품' })).queryByText('4건')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '옵션별' }));
  expect(within(productTable()).getByText('반다나 · 네이비')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '카테고리별' }));
  expect(within(productTable()).getByText('패션 잡화')).toBeInTheDocument();
});

it('행사 없는 연도에서 기간을 검증하고 새 행사의 판매 데이터 빈 상태를 제공한다', () => {
  const service = createMockProductAnalyticsService();
  render(<ProductAnalyticsScreen service={service} />);
  fireEvent.change(screen.getByRole('combobox', { name: '행사 연도' }), { target: { value: '2025' } });
  expect(screen.getByText('데이터를 조회하고 싶은 행사를 추가해주세요')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '행사 추가하기' }));
  const form = within(screen.getByRole('dialog', { name: '행사를 추가해주세요' }));
  fireEvent.change(form.getByLabelText('행사명'), { target: { value: '가을 장터' } });
  fireEvent.change(form.getByLabelText('시작일'), { target: { value: '2025-10-15' } });
  fireEvent.change(form.getByLabelText('종료일'), { target: { value: '2025-10-14' } });
  expect(form.getByRole('alert')).toBeInTheDocument();
  expect(form.getByRole('button', { name: '추가' })).toBeDisabled();
  fireEvent.change(form.getByLabelText('종료일'), { target: { value: '2025-10-16' } });
  fireEvent.click(form.getByRole('button', { name: '추가' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: '행사 선택' })).toHaveDisplayValue('가을 장터');
  expect(screen.getByRole('button', { name: '10.15 (수)' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('선택한 기간에 판매 데이터가 없어요.');
  expect(service.listEvents()).toContainEqual(expect.objectContaining({ name: '가을 장터' }));
});
