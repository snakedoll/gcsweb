import type { SalesManagementLandingV2Service } from '@/lib/services/sales-management-service';
import type { SalesProduct, SellerLandingSummary } from '@/types/sales-management';
import { MockServiceError } from './mock-service';

export type LandingV2MockState = 'success' | 'empty' | 'store-only' | 'no-image' | 'loading' | 'error';

export function parseLandingV2MockState(value?: string): LandingV2MockState {
  switch (value) {
    case 'empty': case 'store-only': case 'no-image': case 'loading': case 'error': return value;
    default: return 'success';
  }
}

const assetRoot = '/assets/sales-management/v2';
// This URL is also encoded in visitor-order-qr.png. Replace both at API integration.
const visitorOrderUrl = 'https://www.gcsweb.kr/QRshop/v2?store=ybbybby0308';

export function createMockLandingV2Service(
  state: LandingV2MockState = 'success',
  options: { productCount?: number } = {},
): SalesManagementLandingV2Service {
  const emptyProducts = state === 'empty' || state === 'store-only' || state === 'no-image';
  let products: SalesProduct[] = Array.from({ length: emptyProducts ? 0 : options.productCount ?? 36 }, (_, index) => ({
    id: `landing-product-${index + 1}`,
    storeId: 'landing-store',
    name: '무슨무슨시계',
    price: 30000,
    imageUrl: `${assetRoot}/watch.png`,
    category: '태그',
    stock: 30,
    isVisible: true,
    options: Array.from({ length: 8 }, (_, option) => ({ id: `option-${option}`, name: `옵션 ${option + 1}`, price: 0, stock: 0 })),
  }));
  let store: SellerLandingSummary['store'] = state === 'empty' ? null : {
    id: 'landing-store', name: '잇장샵', storeIdentifier: 'ybbybby0308', visitorOrderUrl,
    imageUrl: state === 'no-image' ? undefined : `${assetRoot}/store.png`,
  };

  const snapshot = (): SellerLandingSummary => ({
    store: store ? { ...store } : null,
    productCount: products.length,
    orderCount: emptyProducts ? 0 : 128,
    lowStockCount: 0,
    todayRevenue: emptyProducts ? 0 : 128000,
    todaySalesCount: emptyProducts ? 0 : 128,
    // Fixtures are already ordered newest first. Deletion refills the recent window.
    recentProducts: products.slice(0, 6).map(product => ({ ...product, options: product.options.map(option => ({ ...option })) })),
  });

  return {
    async getSellerSummary() {
      if (state === 'loading') await new Promise(resolve => setTimeout(resolve, 1500));
      if (state === 'error') throw new MockServiceError('판매 관리 정보를 불러오지 못했어요.');
      return snapshot();
    },
    async updateStoreImage(file) {
      if (!store) throw new MockServiceError('상점 등록 후 이미지를 등록해주세요.');
      if (!file.type.startsWith('image/')) throw new MockServiceError('이미지 파일을 선택해주세요.');
      const imageUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new MockServiceError('이미지를 불러오지 못했어요. 다시 시도해주세요.'));
        reader.readAsDataURL(file);
      });
      store = { ...store, imageUrl };
      return { ...store };
    },
    async deleteProduct(productId) {
      if (!products.some(product => product.id === productId)) throw new MockServiceError('상품을 찾을 수 없어요.');
      products = products.filter(product => product.id !== productId);
      return snapshot();
    },
    async getVisitorOrderQr() {
      if (!store) throw new MockServiceError('상점 등록 후 QR을 발급받을 수 있어요.');
      return { imageUrl: `${assetRoot}/visitor-order-qr.png`, visitorOrderUrl: store.visitorOrderUrl };
    },
  };
}
