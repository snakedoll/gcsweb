'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { NavBar } from '@/components/layout';

export default function HomePage() {
  const { data: session, status } = useSession();
  const role = session?.user?.role;
  const isAdmin = status === 'authenticated' && role === 'admin';

  return (
    <>
      <div className="flex min-h-screen w-full flex-col">
        <NavBar />
        <div className="mx-auto flex w-full max-w-[375px] flex-1 flex-col px-4 py-6">
          {isAdmin ? (
            <Link
              href="/admin"
              className="rounded-lg bg-orange-5 px-4 py-3 text-center typo-body-small-bold text-neutral-2"
            >
              Admin Page
            </Link>
          ) : null}
        </div>
      </div>
    </>
  );
}
