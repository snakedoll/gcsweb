// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { decrementOnsiteStock, type StockItem } from './stock';

function tx(opts: { optionCount?: number; productCount?: number; optionStock?: number; productStock?: number } = {}) {
  return {
    onsiteProduct: {
      updateMany: vi.fn().mockResolvedValue({ count: opts.productCount ?? 1 }),
      findUnique: vi.fn().mockResolvedValue({ currentStock: opts.productStock ?? 0 }),
    },
    onsiteProductOption: {
      updateMany: vi.fn().mockResolvedValue({ count: opts.optionCount ?? 1 }),
      findUnique: vi.fn().mockResolvedValue({ currentStock: opts.optionStock ?? 0 }),
    },
  };
}

const item = (over: Partial<StockItem<string>> = {}): StockItem<string> => ({
  key: 'i1',
  productId: 'p1',
  optionId: null,
  productName: '엽서',
  optionName: null,
  quantity: 2,
  ...over,
});

describe('decrementOnsiteStock (QR샵 결제 확정·현장 포스 공용)', () => {
  it('재고가 충분하면 조건부로 차감하고 품절 없음', async () => {
    const t = tx();
    expect(await decrementOnsiteStock(t as never, [item()])).toEqual([]);
    expect(t.onsiteProduct.updateMany).toHaveBeenCalledWith({
      where: { productId: 'p1', currentStock: { gte: 2 } },
      data: { currentStock: { decrement: 2 } },
    });
  });

  it('옵션 재고가 모자라면 상품 재고는 건드리지 않고 남은 수량과 함께 품절', async () => {
    const t = tx({ optionCount: 0, optionStock: 1 });
    const result = await decrementOnsiteStock(t as never, [item({ optionId: 'o1', optionName: '빨강' })]);
    expect(result).toEqual([
      { key: 'i1', soldOut: { productId: 'p1', optionId: 'o1', name: '엽서', optionName: '빨강', availableQuantity: 1 } },
    ]);
    expect(t.onsiteProduct.updateMany).not.toHaveBeenCalled();
  });

  it('상품이 삭제됐거나(연결 없음) 옵션이 삭제된 항목은 재고 0 품절', async () => {
    const t = tx();
    const result = await decrementOnsiteStock(t as never, [
      item({ key: 'a', productId: null }),
      item({ key: 'b', optionId: null, optionName: '빨강' }),
    ]);
    expect(result.map((r) => [r.key, r.soldOut.availableQuantity])).toEqual([
      ['a', 0],
      ['b', 0],
    ]);
    expect(t.onsiteProduct.updateMany).not.toHaveBeenCalled();
  });
});
