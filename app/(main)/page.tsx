'use client';

import { BottomTabBar, Footer, NavBar } from '@/components/layout';
import { signOut } from 'next-auth/react';

export default function HomePage() {
  return (
    <>
      <div className="flex min-h-screen w-full flex-col">
        <NavBar />
        <div className="mx-auto flex w-full max-w-[375px] flex-1 flex-col px-4 py-6">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="ml-auto inline-flex h-9 items-center justify-center rounded-md border border-neutral-5 px-3 text-sm text-neutral-10"
          >
            로그아웃
          </button>
        </div>
        <div className="sticky bottom-0 z-20">
          <BottomTabBar variant="home" />
        </div>
        <Footer />
      </div>
    </>
  );
}
