'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import OrdersPage from '@/components/sales-management/v2/orders/OrdersPage';
import { useRequiredSalesManagementV2Service } from '@/components/sales-management/v2/SalesManagementV2Provider';

export default function Page() {
  const router = useRouter();
  const service = useRequiredSalesManagementV2Service();
  const [storeOpenedAt, setStoreOpenedAt] = useState<string>();
  const showBoard = useCallback(() => router.replace('/sales-management/v2/pos/order-board'), [router]);

  useEffect(() => {
    let active = true;
    service.getStore().then(store => { if (active) setStoreOpenedAt(store?.createdAt); }).catch(() => {});
    return () => { active = false; };
  }, [service]);

  return <OrdersPage storeOpenedAt={storeOpenedAt} onMobileBoard={showBoard} />;
}
