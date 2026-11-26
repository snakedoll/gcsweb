import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { SalesProduct } from '@/types/sales-management';
import ProductGrid from './ProductGrid';

afterEach(cleanup);
const product: SalesProduct = { id: 'qa', storeId: 'qa', name: '', category: '', price: 0, stock: 0, options: [], isVisible: true, hasSalesHistory: false };
describe('QA 상품 카드 말줄임', () => {
  it.each([20, 21])('%i자 상품명은 21자부터 줄이고 원문을 보존한다', length => {
    const name = '가'.repeat(length);
    render(<ProductGrid products={[{ ...product, name }]} onDelete={() => {}} />);
    expect(screen.getByRole('heading')).toHaveTextContent(length > 20 ? `${'가'.repeat(20)}…` : name);
    expect(screen.getByRole('heading')).toHaveAttribute('title', name);
  });
  it('옵션 요약 원문과 총재고를 별도 줄에 표시한다', () => {
    const options = [
      { id: '1', name: '옵션 1', price: 0, stock: 4 },
      { id: '2', name: '옵션 2', price: 0, stock: 4 },
      { id: '3', name: '옵션 3', price: 0, stock: 4 },
    ];
    render(<ProductGrid products={[{ ...product, options, stock: 12 }]} onDelete={() => {}} />);
    const summary = '옵션 1(4), 옵션 2(4), 옵션 3(4)';
    expect(screen.getByText(summary, { exact: true })).toHaveAttribute('title', summary);
    expect(screen.getByText('총재고 12개', { exact: true })).toBeVisible();
  });
});
