'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useEffect, useRef, type ReactNode } from 'react';

interface SignOutCacheClearProps {
  children: ReactNode;
}

export default function SignOutCacheClear({ children }: SignOutCacheClearProps) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const hadSession = useRef(!!session);

  useEffect(() => {
    if (hadSession.current && !session) {
      queryClient.removeQueries({ queryKey: ['user', 'profile'] });
    }
    hadSession.current = !!session;
  }, [session, queryClient]);

  return <>{children}</>;
}
