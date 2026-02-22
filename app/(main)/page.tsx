'use client';

import { useSession } from 'next-auth/react';
import { Footer, NavBar, TabBar } from '@/components/layout';

export default function HomePage() {
  const { data: session, status } = useSession();
  const role = session?.user?.role;
  const isAdmin = status === 'authenticated' && role === 'admin';

  return (
    <>
      <div className="flex min-h-screen w-full flex-col">
        <NavBar />
        <div className="mx-auto flex w-full max-w-[375px] flex-1 flex-col px-4 py-6" />
        <div className="sticky bottom-0 z-20">
          <TabBar variant="home" />
        </div>
        <Footer showAdminButton={isAdmin} />
      </div>
    </>
  );
}
