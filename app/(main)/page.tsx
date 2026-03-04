'use client';

import { BottomTabBar, NavBar } from '@/components/layout';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.replace('/login');
  };

  return (
    <>
      <div className="flex min-h-screen w-full flex-col">
        <NavBar />
        <div className="mx-auto flex w-full max-w-[375px] flex-1 flex-col px-4 py-6">
          <button
            type="button"
            onClick={handleSignOut}
            className="ml-auto inline-flex h-9 items-center justify-center rounded-md border border-neutral-5 px-3 text-sm text-neutral-10"
          >
            로그아웃
          </button>
        </div>
        <div className="sticky bottom-0 z-20">
          <BottomTabBar variant="home" />
        </div>
      </div>
    </>
  );
}
