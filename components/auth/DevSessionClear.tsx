'use client';

import { signOut } from 'next-auth/react';
import { useEffect, type ReactNode } from 'react';

interface DevSessionClearProps {
  children: ReactNode;
}

export default function DevSessionClear({ children }: DevSessionClearProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const nav = performance.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined;
    const isReload = nav?.type === 'reload';

    if (isReload) {
      signOut({ redirect: false });
    }
  }, []);

  return <>{children}</>;
}
