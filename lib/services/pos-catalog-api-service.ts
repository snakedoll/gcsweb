import type { PosExposure, PosProduct } from './pos-service';
import { requestSalesApi, StoreApiError, withOperationalStore } from './sales-management-api-client';

type PosProductResponse = {
  id: string;
  name: string;
  imageUrl: string | null;
  category: { id: string; name: string } | null;
  price: number;
  totalStock: number;
  usesOptions: boolean;
  options: { id: string; name: string; surcharge: number; stock: number }[];
  isExposed?: boolean;
  createdAt?: string;
};

type ExposureResponse = {
  groups: { categoryId: string | null; name: string; productIds: string[] }[];
  products: PosProductResponse[];
};

export function createPosCatalogApiService(storeSlug?: string, storeId = '') {
  const exposurePath = withOperationalStore('/pos/exposure', storeSlug);
  const openPath = withOperationalStore('/pos/store-open', storeSlug);
  let categoryIds: Map<string, string | null> | undefined;
  let exposureRequest: Promise<ExposureResponse> | undefined;

  const mapProduct = (product: PosProductResponse): PosProduct => ({
    id: product.id,
    storeId,
    name: product.name,
    price: product.price,
    imageUrl: product.imageUrl ?? undefined,
    category: product.category?.name ?? '',
    stock: product.totalStock,
    options: product.usesOptions ? product.options.map(({ id, name, surcharge, stock }) => ({ id, name, price: surcharge, stock })) : [],
    isVisible: product.isExposed ?? true,
    createdAt: product.createdAt,
    hasSalesHistory: false,
  });

  function rememberCategories(view: ExposureResponse) {
    categoryIds = new Map(view.groups.map(group => [group.name, group.categoryId]));
    return view;
  }

  function getExposureView() {
    // The exposure screen asks for the groups and products together. Keep them on the same response.
    exposureRequest ??= requestSalesApi<ExposureResponse>(exposurePath)
      .then(rememberCategories)
      .finally(() => { exposureRequest = undefined; });
    return exposureRequest;
  }

  return {
    async getCatalog(): Promise<PosProduct[]> {
      const { products } = await requestSalesApi<{ products: PosProductResponse[] }>(withOperationalStore('/pos/products', storeSlug));
      return products.map(mapProduct);
    },
    async getExposureProducts(): Promise<PosProduct[]> {
      return (await getExposureView()).products.map(mapProduct);
    },
    async getExposure(): Promise<PosExposure> {
      return (await getExposureView()).groups.map(group => ({ category: group.name, hidden: false, productIds: group.productIds }));
    },
    async saveExposure(exposure: PosExposure): Promise<void> {
      if (!categoryIds) await getExposureView();
      const groups = exposure.map(group => {
        const categoryId = categoryIds?.get(group.category);
        if (categoryId === undefined) {
          throw new StoreApiError('EXPOSURE_CHANGED', '상품 목록이 변경됐어요. 다시 불러와주세요.', 409);
        }
        return { categoryId, productIds: group.hidden ? [] : group.productIds };
      });
      const view = await requestSalesApi<ExposureResponse>(exposurePath, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups }),
      });
      rememberCategories(view);
    },
    async getStoreOpen(): Promise<boolean> {
      const data = await requestSalesApi<{ isOpen: boolean }>(openPath);
      return data.isOpen;
    },
    async setStoreOpen(isOpen: boolean): Promise<boolean> {
      const data = await requestSalesApi<{ isOpen: boolean }>(openPath, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOpen }),
      });
      return data.isOpen;
    },
  };
}
