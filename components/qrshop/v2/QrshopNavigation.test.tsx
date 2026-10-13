import { StrictMode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearQrshopMockOrders, qrshopMockService } from '@/lib/mocks/qrshop-service';
import QrshopOrderClient from './QrshopOrderClient';
import QrshopPayClient from './QrshopPayClient';
import QrshopResultClient from './QrshopResultClient';

const navigation = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), query: '' }));

vi.mock('next/navigation', () => ({
  useRouter: () => navigation,
  useSearchParams: () => new URLSearchParams(navigation.query),
}));

beforeEach(() => {
  vi.clearAllMocks();
  navigation.query = '';
  clearQrshopMockOrders();
});
afterEach(cleanup);

async function createOrderThroughScreen() {
  const view = render(<QrshopOrderClient />);
  fireEvent.click(await screen.findByRole('button', { name: '무슨무슨 키링 BLACK ORANGE 담기' }));
  fireEvent.click(screen.getByRole('button', { name: 'BLACK' }));
  fireEvent.click(screen.getByRole('button', { name: '완료' }));
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: '결제하기' }));
  await waitFor(() => expect(navigation.push).toHaveBeenCalledWith(expect.stringMatching(/^\/QRshop\/pay\?orderId=.+/)));
  const payUrl = new URL(navigation.push.mock.lastCall![0], 'https://example.test');
  navigation.query = payUrl.search;
  view.unmount();
  return payUrl;
}

describe('QRshop v2 화면 연결', () => {
  it('닫힌 상점에서는 목록과 카테고리만 보여주고 상품 선택과 결제를 막는다', async () => {
    navigation.query = '?scenario=closed';
    render(<QrshopOrderClient />);
    await screen.findByText('상점이 아직 오픈되지 않았어요!');
    expect(screen.getByRole('status')).toHaveTextContent('상점이 아직 오픈되지 않았어요!');
    const product = screen.getByRole('button', { name: '무슨무슨 키링 BLACK ORANGE 담기' });
    expect(product).toBeDisabled();
    fireEvent.click(product);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '결제하기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: '선택 상품 목록' })).not.toBeInTheDocument();
    expect(screen.getByRole('main')).not.toHaveClass('pb-[360px]');
    fireEvent.click(screen.getByRole('button', { name: '키링' }));
    expect(screen.getByRole('button', { name: '키링' })).toHaveClass('text-orange-5');
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it.each([['empty', '해당 샵에 아직 등록된 상품이 없습니다!'], ['error', '존재하지 않는 상점입니다']])('%s 상태를 유지한다', async (scenario, title) => {
    navigation.query = `?scenario=${scenario}`;
    render(<QrshopOrderClient />);
    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '결제하기' })).not.toBeInTheDocument();
  });

  it('기본 목록에서 기존 상품과 QA 예외 상품을 함께 표시한다', async () => {
    render(<QrshopOrderClient />);

    expect(await screen.findByRole('button', { name: '무슨무슨 키링 BLACK ORANGE 담기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '이미지 없는 단일 상품 담기' })).toBeInTheDocument();
  });

  it('예외 케이스 시나리오에서 다수 카테고리와 6개 이상 옵션을 표시한다', async () => {
    navigation.query = '?scenario=edge-cases';
    render(<QrshopOrderClient />);

    expect(await screen.findByRole('button', { name: '이미지 없음' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '카테고리 넘침 B' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '키링' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '무슨무슨 키링 BLACK ORANGE 담기' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /옵션이 여덟 개인 상품/ }));
    const dialog = screen.getByRole('dialog', { name: '옵션이 여덟 개인 상품' });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getAllByRole('button', { name: /^옵션 \d/ })).toHaveLength(8);
  });

  it('상품 클릭 시 판매 중인 옵션을 결제 목록에 반영한다', async () => {
    render(<QrshopOrderClient />);
    fireEvent.click(await screen.findByRole('button', { name: '무슨무슨 키링 BLACK ORANGE 담기' }));
    expect(screen.getByText('옵션은 복수선택 가능합니다.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'BLACK' }));
    expect(screen.getByRole('button', { name: /ORANGE.*품절/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '완료' }));
    const selectedProducts = screen.getByRole('list', { name: '선택 상품 목록' });
    expect(within(selectedProducts).getByText('BLACK')).toBeInTheDocument();
  });

  it('옵션 없는 상품은 모달 없이 결제 목록에 바로 담는다', async () => {
    render(<QrshopOrderClient />);
    fireEvent.click(await screen.findByRole('button', { name: '옵션이 없는 기본 상품 담기' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: '선택 상품 목록' })).getByText('옵션이 없는 기본 상품')).toBeInTheDocument();
  });

  it('결제 목록 상품을 누르면 해당 상품의 기존 선택으로 옵션 모달을 연다', async () => {
    render(<QrshopOrderClient />);
    fireEvent.click(await screen.findByRole('button', { name: '무슨무슨 키링 BLACK ORANGE 담기' }));
    fireEvent.click(screen.getByRole('button', { name: 'BLACK' }));
    fireEvent.click(screen.getByRole('button', { name: '완료' }));
    fireEvent.click(screen.getByRole('button', { name: '무슨무슨 키링 옵션 변경' }));
    expect(screen.getByRole('dialog', { name: '무슨무슨 키링' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'BLACK' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('품절 탭에서 품절 상품은 선택할 수 없고 판매 중인 옵션은 결제한다', async () => {
    render(<QrshopOrderClient />);

    fireEvent.click(await screen.findByRole('button', { name: '품절' }));
    fireEvent.click(screen.getByRole('button', { name: /소원 엽서 BLUE 품절/ }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('소원 엽서이 품절되었습니다.');
    fireEvent.click(screen.getByRole('button', { name: '확인' }));

    fireEvent.click(screen.getByRole('button', { name: '무슨무슨 키링 BLACK ORANGE 담기' }));
    expect(screen.getByRole('button', { name: /ORANGE.*품절/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'BLACK' }));
    fireEvent.click(screen.getByRole('button', { name: '완료' }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '결제하기' }));

    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith(expect.stringMatching(/^\/QRshop\/pay\?orderId=.+/)));
  });

  it('결제 직전에 품절된 옵션만 제외하고 나머지 상품은 유지한다', async () => {
    navigation.query = '?scenario=soldout';
    render(<QrshopOrderClient />);
    fireEvent.click(await screen.findByRole('button', { name: '무슨무슨 키링 BLACK ORANGE 담기' }));
    fireEvent.click(screen.getByRole('button', { name: 'BLACK' }));
    fireEvent.click(screen.getByRole('button', { name: '완료' }));
    fireEvent.click(screen.getByRole('button', { name: '피그먼트 티셔츠 S L 담기' }));
    fireEvent.click(screen.getByRole('button', { name: 'S' }));
    fireEvent.click(screen.getByRole('button', { name: '완료' }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '결제하기' }));
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('무슨무슨 키링이 품절되었습니다.');
    expect(within(screen.getByRole('list', { name: '선택 상품 목록' })).queryByText('BLACK')).not.toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: '선택 상품 목록' })).getByText('S')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '무슨무슨 키링 BLACK ORANGE 품절' })).toBeInTheDocument();
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it('StrictMode의 초기 중복 조회에서도 재고 변경 시나리오는 결제 확인 전까지 판매 중이다', async () => {
    navigation.query = '?scenario=soldout';
    render(<StrictMode><QrshopOrderClient /></StrictMode>);
    fireEvent.click(await screen.findByRole('button', { name: '무슨무슨 키링 BLACK ORANGE 담기' }));
    expect(screen.getByRole('button', { name: 'BLACK' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'BLACK' }));
    fireEvent.click(screen.getByRole('button', { name: '완료' }));
    expect(within(screen.getByRole('list', { name: '선택 상품 목록' })).getByText('BLACK')).toBeInTheDocument();
  });

  it('결제 재확인 중 상점이 닫히면 주문을 만들지 않고 기존 선택을 보존한다', async () => {
    navigation.query = '?scenario=closed-on-refresh';
    render(<QrshopOrderClient />);
    fireEvent.click(await screen.findByRole('button', { name: '무슨무슨 키링 BLACK ORANGE 담기' }));
    fireEvent.click(screen.getByRole('button', { name: 'BLACK' }));
    fireEvent.click(screen.getByRole('button', { name: '완료' }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '결제하기' }));
    expect(await screen.findByRole('status')).toHaveTextContent('상점이 아직 오픈되지 않았어요!');
    expect(screen.getByRole('button', { name: '무슨무슨 키링 BLACK ORANGE 담기' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it('상품 주문부터 결제 완료와 처음으로 이동까지 v2 주소를 유지한다', async () => {
    const payUrl = await createOrderThroughScreen();
    const pay = render(<QrshopPayClient />);
    fireEvent.click(await screen.findByRole('button', { name: '결제 완료하기' }));
    await waitFor(() => expect(navigation.push).toHaveBeenLastCalledWith(`/QRshop/result${payUrl.search}`));
    pay.unmount();

    render(<QrshopResultClient />);
    expect(await screen.findByRole('heading', { name: '결제가 완료되었습니다' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '처음으로' }));
    expect(navigation.push).toHaveBeenLastCalledWith('/QRshop');
  });

  it('실패한 결제의 재시도도 같은 v2 주문으로 연결한다', async () => {
    const payUrl = await createOrderThroughScreen();
    const pay = render(<QrshopPayClient />);
    fireEvent.click(await screen.findByRole('button', { name: '결제 실패 상태 확인' }));
    await waitFor(() => expect(navigation.push).toHaveBeenLastCalledWith(`/QRshop/result${payUrl.search}`));
    pay.unmount();

    render(<QrshopResultClient />);
    fireEvent.click(await screen.findByRole('button', { name: '결제 다시 시도' }));
    expect(navigation.push).toHaveBeenLastCalledWith(`${payUrl.pathname}${payUrl.search}`);
  });

  it('완료 주문이 4개 이상이면 상품 목록만 스크롤하고 결제 요약은 고정한다', async () => {
    const order = await qrshopMockService.createOrder({
      buyerName: '현장 주문',
      buyerPhone: '',
      paymentMethod: 'on-site',
      lines: Array.from({ length: 4 }, (_, index) => ({
        productId: `product-${index + 1}`,
        productName: `상품 ${index + 1}`,
        option: 'BLACK',
        quantity: 1,
        unitPrice: 10_000,
      })),
    });
    await qrshopMockService.processPayment(order.orderId, 'success');
    navigation.query = `?orderId=${order.orderId}`;

    render(<QrshopResultClient />);

    const list = await screen.findByRole('list', { name: '완료 주문 상품 목록' });
    expect(list).toHaveClass('max-h-[343px]', 'overflow-y-auto');
    expect(screen.getByRole('group', { name: '결제 결과 요약' })).toHaveClass('shrink-0');
    expect(screen.getByRole('main')).toHaveClass('h-dvh', 'overflow-hidden');
  });
});
