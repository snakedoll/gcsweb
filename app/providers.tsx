'use client';

import DevSessionClear from '@/components/auth/DevSessionClear';
import SignOutCacheClear from '@/components/auth/SignOutCacheClear';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { useState, type ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <SessionProvider>
      <DevSessionClear>
        <QueryClientProvider client={queryClient}>
          <SignOutCacheClear>{children}</SignOutCacheClear>
        </QueryClientProvider>
      </DevSessionClear>
    </SessionProvider>
  );
}
