'use client';

import { Banner, BottomTabBar, Footer, NavBar } from '@/components/layout';
import TabBar from '@/components/ui/button/TabBar';
import EmptyviewText from '@/components/ui/common/EmptyviewText';
import { useState } from 'react';

const communityTabItems = [
  { key: 'board', title: 'Board' },
  { key: 'lounge', title: 'Lounge' },
];

export default function CommunityPage() {
  const [activeSection, setActiveSection] = useState('board');

  return (
    <div className="min-h-screen bg-neutral-3">
      <div className="mx-auto flex min-h-screen w-full max-w-[375px] flex-col bg-neutral-3">
        <NavBar />
        <Banner variant="community" />

        <TabBar
          items={communityTabItems}
          activeKey={activeSection}
          onChange={setActiveSection}
          className="bg-neutral-3 py-0"
        />

        <main className="flex-1">
          <section className="flex h-[507px] items-center justify-center bg-neutral-3 px-5">
            <EmptyviewText
              className="w-[307px]"
              title="Comming Soon!"
              subtitle="Community는 추후 오픈 예정입니다."
            />
          </section>
        </main>

        <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[375px] -translate-x-1/2">
          <BottomTabBar variant="community" />
        </div>
        <div className="pb-[74px]">
          <Footer />
        </div>
      </div>
    </div>
  );
}

