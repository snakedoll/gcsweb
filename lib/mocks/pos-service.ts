import type { SalesManagementV2Service } from '@/lib/services/sales-management-service';
import { copyPosExposure, createPosLine, getPosStock, posLineDiscount, posLineKey, posLineSubtotal, PosStockChangedError, reconcilePosExposure, type PosCartLine, type PosExposure, type PosProduct, type PosReceipt, type PosService } from '@/lib/services/pos-service';
import type { SalesProduct } from '@/types/sales-management';

// Reuse the v2 catalog. Sales and stock deductions belong to this POS session only.
export function createMockPosService(source: Pick<SalesManagementV2Service, 'getProducts'> & Partial<Pick<SalesManagementV2Service, 'getCategories'>>): PosService {
  const sold = new Map<string, number>();
  const receipts: PosReceipt[] = [];
  let exposure: PosExposure | null = null;

  async function loadExposure() {
    const [result, categories] = await Promise.all([source.getProducts(), source.getCategories?.() ?? []]);
    const products: PosProduct[] = result.items;
    exposure = reconcilePosExposure(exposure ?? [...new Set(products.map(product => product.category))].map(category => ({
      category, hidden: false, productIds: products.filter(product => product.category === category && product.isVisible).map(product => product.id),
    })), products, categories);
    return { products, exposure };
  }

  function exposed(products: SalesProduct[], groups: PosExposure) {
    return groups.filter(group => !group.hidden).flatMap(group => group.productIds.flatMap(id => {
      const product = products.find(item => item.id === id);
      return product ? [{ ...product, isVisible: true }] : [];
    }));
  }

  function remaining(products: SalesProduct[]) {
    return products.map(product => {
      const options = product.options.map(option => ({ ...option,
        stock: Math.max(0, option.stock - (sold.get(posLineKey({ productId: product.id, optionId: option.id })) ?? 0)),
      }));
      const count = product.options.length
        ? product.options.reduce((sum, option) => sum + (sold.get(posLineKey({ productId: product.id, optionId: option.id })) ?? 0), 0)
        : sold.get(posLineKey({ productId: product.id })) ?? 0;
      return { ...product, options, stock: Math.max(0, product.stock - count) };
    });
  }

  return {
    async getCatalog() {
      const state = await loadExposure();
      return remaining(exposed(state.products, state.exposure));
    },
    async getReceipts() { return structuredClone(receipts.slice().reverse()); },
    async getExposureProducts() { return remaining((await source.getProducts()).items); },
    async getExposure() { return copyPosExposure((await loadExposure()).exposure); },
    async saveExposure(next) {
      const { products } = await loadExposure();
      const ids = next.flatMap(group => group.productIds);
      if (new Set(next.map(group => group.category)).size !== next.length || new Set(ids).size !== ids.length ||
          next.some(group => group.productIds.some(id => !products.some(product => product.id === id && product.category === group.category)))) {
        throw new Error('상품 목록이 변경되었어요. 다시 확인해주세요.');
      }
      exposure = reconcilePosExposure(copyPosExposure(next), products);
    },
    async completeSale(lines, paymentMethod) {
      if (!['card', 'cash', 'transfer'].includes(paymentMethod)) throw new Error('결제수단을 선택해주세요.');
      if (!lines.length) throw new Error('상품을 선택해주세요.');
      const state = await loadExposure();
      const products = remaining(exposed(state.products, state.exposure));
      const catalog = new Map(products.map(product => [product.id, product]));
      const unavailable = lines.filter(line => {
        const product = catalog.get(line.productId);
        return !product || getPosStock(product, line.optionId) <= 0;
      });
      if (unavailable.length) throw new PosStockChangedError(unavailable.map(posLineKey));

      const merged = new Map<string, PosCartLine>();
      for (const line of lines) {
        if (!Number.isSafeInteger(line.quantity) || line.quantity < 1) throw new Error('상품 수량을 확인해주세요.');
        const product = catalog.get(line.productId)!;
        const pricedLine = createPosLine(product, line.optionId);
        const discount = line.discountAmount ?? 0;
        if (!Number.isSafeInteger(discount) || discount < 0 || discount > pricedLine.unitPrice * line.quantity) {
          throw new Error('할인 금액을 확인해주세요.');
        }
        const key = posLineKey(line);
        const previous = merged.get(key);
        const quantity = (previous?.quantity ?? 0) + line.quantity;
        if (quantity > getPosStock(product, line.optionId)) throw new Error('남은 재고수 이상으로 상품을 담을 수 없습니다.');
        const discountAmount = (previous?.discountAmount ?? 0) + discount;
        merged.set(key, { ...pricedLine, quantity, ...(discountAmount > 0 ? { discountAmount } : {}) });
      }
      const resolved = [...merged.values()];
      for (const product of products) {
        if (resolved.filter(line => line.productId === product.id).reduce((sum, line) => sum + line.quantity, 0) > product.stock) {
          throw new Error('남은 재고수 이상으로 상품을 담을 수 없습니다.');
        }
      }
      // No awaits between validation and stock deduction: repeated requests see the updated stock.
      for (const line of resolved) {
        const key = posLineKey(line);
        sold.set(key, (sold.get(key) ?? 0) + line.quantity);
      }
      const receipt = {
        orderCode: String(receipts.length + 1).padStart(3, '0'), lines: resolved, paymentMethod,
        totalAmount: resolved.reduce((sum, line) => sum + posLineSubtotal(line) - posLineDiscount(line), 0),
      };
      receipts.push(receipt);
      return structuredClone(receipt);
    },
  };
}
