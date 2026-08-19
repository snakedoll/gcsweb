import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import QrshopCartPanel from './QrshopCartPanel';

const line = {
  productId: 'keyring-black',
  productName: '무슨무슨 키링',
  option: 'BLACK',
  quantity: 1,
  unitPrice: 15_000,
};

afterEach(cleanup);

function renderPanel(overrides: Partial<React.ComponentProps<typeof QrshopCartPanel>> = {}) {
  const props: React.ComponentProps<typeof QrshopCartPanel> = {
    lines: [line],
    buyerName: '김잇장',
    buyerPhone: '010-1234-5678',
    paymentMethod: 'online',
    agreed: true,
    submitting: false,
    error: null,
    onBuyerNameChange: vi.fn(),
    onBuyerPhoneChange: vi.fn(),
    onPaymentMethodChange: vi.fn(),
    onAgreementChange: vi.fn(),
    onQuantityChange: vi.fn(),
    onRemove: vi.fn(),
    onSubmit: vi.fn(),
    ...overrides,
  };
  render(<QrshopCartPanel {...props} />);
  return props;
}

describe('QrshopCartPanel', () => {
  it('선택 상품 합계와 주문 정보를 표시하고 제출한다', () => {
    const props = renderPanel();
    expect(screen.getAllByText('15,000원')).toHaveLength(2);
    expect(screen.getByDisplayValue('김잇장')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '결제하기' }));
    expect(props.onSubmit).toHaveBeenCalledOnce();
  });

  it('빈 장바구니에서는 결제 버튼을 비활성화한다', () => {
    renderPanel({ lines: [], buyerName: '', buyerPhone: '', agreed: false });
    expect(screen.getByRole('button', { name: '결제하기' })).toBeDisabled();
    expect(screen.getByText('0원')).toBeInTheDocument();
  });

  it('수량 변경과 삭제 이벤트를 전달한다', () => {
    const props = renderPanel();
    fireEvent.click(screen.getByRole('button', { name: '무슨무슨 키링 수량 증가' }));
    fireEvent.click(screen.getByRole('button', { name: '무슨무슨 키링 삭제' }));
    expect(props.onQuantityChange).toHaveBeenCalledWith('keyring-black', 2);
    expect(props.onRemove).toHaveBeenCalledWith('keyring-black');
  });
});
