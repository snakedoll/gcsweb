'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import PosProvider from './pos/PosProvider';
import { createPosApiService } from '@/lib/services/pos-api-service';
import { createOrdersApiService } from '@/lib/services/orders-api-service';
import { createPosStaffApiService, getOperationalStoreRole } from '@/lib/services/pos-staff-api-service';
import { usePathname, useSearchParams } from 'next/navigation';
import { createStoreApiService } from '@/lib/services/sales-management-store-api-service';
import { createMockProductAnalyticsService } from '@/lib/mocks/product-analytics-service';
import type { ProductAnalyticsService } from '@/lib/services/product-analytics-service';
import type { SalesManagementV2Service } from '@/lib/services/sales-management-service';
import { createMockLandingV2Service, parseLandingV2MockState } from '@/lib/mocks/sales-management-landing-v2-service';

const ServiceContext = createContext<SalesManagementV2Service | null>(null);
const ProductAnalyticsContext = createContext<ProductAnalyticsService | null>(null);

export default function SalesManagementV2Provider({ children, service }: { children: ReactNode; service?: SalesManagementV2Service }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Owned by the client layout: shared across v2 navigation, reset on a full reload.
  const [activeService] = useState(() => service ?? (process.env.NEXT_PUBLIC_SALES_MANAGEMENT_DATA_SOURCE === 'api' ? createStoreApiService() : createMockLandingV2Service(
    parseLandingV2MockState(searchParams.get('state') ?? undefined), { catalog: true },
  )));
  const [productAnalyticsService] = useState(() => createMockProductAnalyticsService());
  const apiMode = activeService.dataSource === 'api';
  const analytics = pathname?.startsWith('/sales-management/v2/analytics');
  const orderBoard = pathname?.startsWith('/sales-management/v2/pos/order-board');
  const operational = pathname === '/sales-management/v2/orders' || pathname === '/sales-management/v2/pos' ||
    pathname?.startsWith('/sales-management/v2/pos/');
  const storeSlug = searchParams.get('storeSlug') ?? undefined;
  if (apiMode && (analytics || orderBoard)) {
    return <main><p role="status">{analytics ? '상품 분석' : '주문서 보드'} 연동은 준비 중이에요.</p><Link href="/sales-management/v2">판매 관리 홈으로</Link></main>;
  }

  return <ServiceContext.Provider value={activeService}>
    {apiMode ? operational ? <OperationalApiProvider key={storeSlug === undefined ? 'owner' : `store:${storeSlug}`} storeSlug={storeSlug}>
      {children}
    </OperationalApiProvider> : children : <PosProvider>
      <ProductAnalyticsContext.Provider value={productAnalyticsService}>
        {children}
      </ProductAnalyticsContext.Provider>
    </PosProvider>}
  </ServiceContext.Provider>;
}

type OperationalAccess = Awaited<ReturnType<typeof getOperationalStoreRole>>;

function OperationalApiProvider({ children, storeSlug }: { children: ReactNode; storeSlug?: string }) {
  const [access, setAccess] = useState<OperationalAccess | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoadError(false);
    getOperationalStoreRole(storeSlug).then(value => { if (active) setAccess(value); })
      .catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, [storeSlug, retry]);

  if (loadError) return <main><p role="alert">현장 운영 권한을 확인하지 못했어요.</p>
    <button type="button" onClick={() => setRetry(attempt => attempt + 1)}>다시 확인</button>
    <Link href="/sales-management/v2">판매 관리 홈으로</Link></main>;
  if (access === undefined) return <p role="status">현장 운영 권한을 확인하는 중입니다.</p>;
  if (!access) return <main><p role="status">현장 운영 권한이 있는 상점을 찾을 수 없어요.</p>
    <Link href="/sales-management/v2">판매 관리 홈으로</Link></main>;

  return <AuthorizedOperationalProvider role={access.role} storeId={access.store.storeId} storeSlug={storeSlug}>
    {children}
  </AuthorizedOperationalProvider>;
}

function AuthorizedOperationalProvider({ children, role, storeId, storeSlug }: {
  children: ReactNode; role: 'OWNER' | 'STAFF'; storeId: string; storeSlug?: string;
}) {
  const [services] = useState(() => ({
    pos: createPosApiService(storeSlug, storeId),
    orders: createOrdersApiService(storeSlug),
    staff: createPosStaffApiService(),
  }));
  return <PosProvider service={services.pos} ordersService={services.orders} staffService={services.staff}
    role={role} storeSlug={storeSlug}>{children}</PosProvider>;
}

export function useSalesManagementV2Service() { return useContext(ServiceContext); }

export function useRequiredSalesManagementV2Service() {
  const service = useSalesManagementV2Service();
  if (!service) throw new Error('상품 관리 v2 Provider가 필요합니다.');
  return service;
}

export function useProductAnalyticsService() {
  const service = useContext(ProductAnalyticsContext);
  if (!service) throw new Error('상품 분석 v2 Provider가 필요합니다.');
  return service;
}
