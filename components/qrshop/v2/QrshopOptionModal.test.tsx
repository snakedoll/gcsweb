import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import QrshopOptionModal from './QrshopOptionModal';

const products = [
  { id: 's', categoryId: 'shirt', categoryName: '의류', name: '티셔츠', option: 'S', price: 10_000 },
  { id: 'l', categoryId: 'shirt', categoryName: '의류', name: '티셔츠', option: 'L', price: 11_000 },
  { id: 'xl', categoryId: 'shirt', categoryName: '의류', name: '티셔츠', option: 'XL', price: 12_000, soldOut: true },
];

afterEach(cleanup);

describe('QrshopOptionModal', () => {
  it('복수 옵션, 추가 금액, 품절 상태를 표시하고 선택을 확정한다', () => {
    const onConfirm = vi.fn();
    render(<QrshopOptionModal products={products} selectedIds={[]} onClose={() => undefined} onConfirm={onConfirm} />);

    expect(screen.getByText('+ 1,000원')).toBeInTheDocument();
    expect(screen.getByText('품절')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /XL/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'S' }));
    fireEvent.click(screen.getByRole('button', { name: /L.*1,000원/ }));
    fireEvent.click(screen.getByRole('button', { name: '완료' }));
    expect(onConfirm).toHaveBeenCalledWith(['s', 'l']);
  });

  it('이미 선택된 옵션이 품절되면 완료해도 담지 않는다', () => {
    const onConfirm = vi.fn();
    render(<QrshopOptionModal products={products} selectedIds={['xl']} onClose={() => undefined} onConfirm={onConfirm} />);
    expect(screen.getByRole('button', { name: '완료' })).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('모든 옵션이 품절이면 어떤 옵션도 선택하거나 담을 수 없다', () => {
    const onConfirm = vi.fn();
    render(<QrshopOptionModal products={products.map((product) => ({ ...product, soldOut: true }))} selectedIds={['s']} onClose={() => undefined} onConfirm={onConfirm} />);
    expect(screen.getByRole('button', { name: /^S.*품절$/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^L.*품절$/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: '완료' })).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
