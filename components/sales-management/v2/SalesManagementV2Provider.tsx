'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import type { SalesManagementV2Service } from '@/lib/services/sales-management-service';
import { createMockLandingV2Service, parseLandingV2MockState } from '@/lib/mocks/sales-management-landing-v2-service';

const ServiceContext = createContext<SalesManagementV2Service | null>(null);

export default function SalesManagementV2Provider({ children, service }: { children: ReactNode; service?: SalesManagementV2Service }) {
  const searchParams = useSearchParams();
  // Owned by the client layout: shared across v2 navigation, reset on a full reload.
  const [activeService] = useState(() => service ?? createMockLandingV2Service(
    parseLandingV2MockState(searchParams.get('state') ?? undefined), { catalog: true },
  ));
  return <ServiceContext.Provider value={activeService}>{children}</ServiceContext.Provider>;
}

export function useSalesManagementV2Service() { return useContext(ServiceContext); }

export function useRequiredSalesManagementV2Service() {
  const service = useSalesManagementV2Service();
  if (!service) throw new Error('상품 관리 v2 Provider가 필요합니다.');
  return service;
}
