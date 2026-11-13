import type { Prisma } from '@prisma/client';
import type { SoldOutItem } from './order-validation';

/**
 * 현장 판매 재고 차감. QR샵 결제 확정(payment-confirm)과 현장 포스 결제(pos-sale)가 같이 쓴다.
 * 두 곳의 품절 판정이 어긋나지 않도록 규칙을 여기 한 곳에 둔다.
 *
 * - 항목별로 `현재 재고 >= 수량`일 때만 차감한다(조건부 update). 옵션 상품은 옵션과 상품 재고(= 옵션 합계)를 함께 줄인다.
 * - 상품이나 옵션이 삭제돼 연결이 비어 있는 항목은 품절로 본다(남은 수량 0).
 * - 모자란 항목을 모아서 돌려준다. 되돌리기는 호출 쪽 트랜잭션이 한다.
 */
export type StockItem<K> = {
  /** 호출 쪽이 결과를 자기 항목과 잇는 값(예: OrderItem id) */
  key: K;
  productId: string | null;
  optionId: string | null;
  productName: string;
  optionName: string | null;
  quantity: number;
};

export type StockShortage<K> = { key: K; soldOut: SoldOutItem };

type StockTx = Pick<Prisma.TransactionClient, 'onsiteProduct' | 'onsiteProductOption'>;

export async function decrementOnsiteStock<K>(tx: StockTx, items: StockItem<K>[]): Promise<StockShortage<K>[]> {
  const shortages: StockShortage<K>[] = [];

  for (const item of items) {
    const shortage = (availableQuantity: number): StockShortage<K> => ({
      key: item.key,
      soldOut: {
        productId: item.productId,
        optionId: item.optionId,
        name: item.productName,
        optionName: item.optionName,
        availableQuantity: Math.max(availableQuantity, 0),
      },
    });

    const deletedOption = item.optionName !== null && item.optionId === null;
    if (item.productId === null || deletedOption) {
      shortages.push(shortage(0));
      continue;
    }

    if (item.optionId !== null) {
      const option = await tx.onsiteProductOption.updateMany({
        where: { optionId: item.optionId, currentStock: { gte: item.quantity } },
        data: { currentStock: { decrement: item.quantity } },
      });
      if (option.count !== 1) {
        const current = await tx.onsiteProductOption.findUnique({
          where: { optionId: item.optionId },
          select: { currentStock: true },
        });
        shortages.push(shortage(current?.currentStock ?? 0));
        continue;
      }
    }

    const product = await tx.onsiteProduct.updateMany({
      where: { productId: item.productId, currentStock: { gte: item.quantity } },
      data: { currentStock: { decrement: item.quantity } },
    });
    if (product.count !== 1) {
      const current = await tx.onsiteProduct.findUnique({
        where: { productId: item.productId },
        select: { currentStock: true },
      });
      shortages.push(shortage(current?.currentStock ?? 0));
    }
  }

  return shortages;
}
