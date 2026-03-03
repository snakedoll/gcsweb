import { useSession } from 'next-auth/react';
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
  notificationCount?: number;
  createdAt: string;
}

async function fetchUserProfile(): Promise<UserProfile | null> {
  const res = await fetch('/api/user/profile');
  if (res.status === 401 || res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error('Failed to fetch user profile');
  }
  return res.json();
}

export function useUser() {
  const { data: session, status, update } = useSession();
  
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: fetchUserProfile,
    enabled: !!session,
    retry: false,
  });

  return {
    session,
    profile,
    update,
    isLoading: status === 'loading' || isProfileLoading,
    isAuthenticated: !!session,
  };
}
