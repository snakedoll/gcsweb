'use client';

import { useSession } from 'next-auth/react';
import PosPage from '@/components/sales-management/v2/pos/PosPage';

export default function Page() {
  const { data: session } = useSession();
  return <PosPage accountId={session?.user?.id} />;
}
