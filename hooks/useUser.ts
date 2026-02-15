import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  nickname?: string;
  role: string;
  profileImage?: string;
  createdAt: string;
}

async function fetchUserProfile(): Promise<UserProfile> {
  const res = await fetch('/api/user/profile');
  if (!res.ok) {
    throw new Error('Failed to fetch user profile');
  }
  return res.json();
}

export function useUser() {
  const { data: session, status } = useSession();
  
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: fetchUserProfile,
    enabled: !!session,
  });

  return {
    session,
    profile,
    isLoading: status === 'loading' || isProfileLoading,
    isAuthenticated: !!session,
  };
}
