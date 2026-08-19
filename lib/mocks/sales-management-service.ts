import type { SalesManagementService } from '@/lib/services/sales-management-service';
import { resolveMockScenario, type MockScenario } from './mock-service';
import type { ProductFormInput, SalesProduct, SalesStore } from '@/types/sales-management';

const defaultStore: SalesStore = {
  id: 'store-ittjang',
  name: '잇장샵',
  description: '일상의 즐거움을 소개하는 상점',
};

export interface SalesManagementMockOptions {
  store?: SalesStore | null;
  products?: SalesProduct[];
  saveProductScenario?: MockScenario<SalesProduct>;
}

export function createSalesManagementMockService(
  options: SalesManagementMockOptions = {},
): SalesManagementService {
  const products = [...(options.products ?? [])];

  return {
    getStore: async () => options.store ?? defaultStore,
    saveStore: async (store) => ({ ...defaultStore, ...store }),
    getProducts: async () => ({ items: products, total: products.length }),
    saveProduct: async (input: ProductFormInput) => {
      const product: SalesProduct = {
        id: `product-${products.length + 1}`,
        storeId: input.storeId,
        name: input.name,
        category: input.category,
        price: input.price,
        stock: input.stock,
        imageUrl: input.imageUrl,
        isVisible: true,
        options: input.options.map((option, index) => ({
          id: `option-${index + 1}`,
          ...option,
        })),
      };
      const saved = options.saveProductScenario
        ? await resolveMockScenario(options.saveProductScenario)
        : product;
      products.unshift(saved);
      return saved;
    },
    getOrders: async () => ({ items: [], total: 0 }),
    getInventory: async () => ({ items: [], total: 0 }),
  };
}
