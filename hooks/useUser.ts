import { useSession, signOut } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  nickname?: string;
  role: string;
  profileImage?: string;
  isSeller?: boolean;
  memberType?: number;
  signupMethod?: 'EMAIL' | 'KAKAO';
  hasPassword?: boolean;
  notificationCount?: number;
  createdAt: string;
}

async function fetchUserProfile(on401?: () => void): Promise<UserProfile | null> {
  const res = await fetch('/api/user/profile');
  if (res.status === 401) {
    on401?.();
    return null;
  }
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error('Failed to fetch user profile');
  }
  return res.json();
}

export function useUser() {
  const { data: session, status, update } = useSession();

  const { data: profile, isLoading: isProfileLoading, isFetched } = useQuery({
    queryKey: ['user', 'profile', session?.user?.id],
    queryFn: () => fetchUserProfile(() => signOut({ callbackUrl: '/login' })),
    enabled: !!session,
    retry: false,
  });

  const isSessionLoading = status === 'loading';
  // 세션은 존재하지만 프로필 쿼리가 아직 완료되지 않은 경우도 로딩으로 처리
  const isProfilePending = !!session && !isFetched;

  return {
    session,
    profile,
    update,
    isLoading: isSessionLoading || isProfileLoading || isProfilePending,
    isAuthenticated: !!session,
  };
}
