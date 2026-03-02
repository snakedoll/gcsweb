'use client';

import { BottomTabBar, Footer, NavBar } from '@/components/layout';

export default function HomePage() {
  return (
    <>
      <div className="flex min-h-screen w-full flex-col">
        <NavBar />
        <div className="mx-auto flex w-full max-w-[375px] flex-1 flex-col px-4 py-6" />
        <div className="sticky bottom-0 z-20">
          <BottomTabBar variant="home" />
        </div>
        <Footer />
      </div>
    </>
  );
}
