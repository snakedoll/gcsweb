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
      <div className="mx-auto w-full max-w-[375px] bg-neutral-3">
        <NavBar />
        <Banner variant="community" />

        <TabBar
          items={communityTabItems}
          activeKey={activeSection}
          onChange={setActiveSection}
          className="bg-neutral-3 py-0"
        />

        <section className="flex h-[439px] items-center justify-center bg-neutral-3 px-5">
          <EmptyviewText
            className="w-[307px]"
            title="Comming Soon!"
            subtitle="Community는 추후 오픈 예정입니다."
          />
        </section>

        <BottomTabBar variant="community" />
        <Footer />
      </div>
    </div>
  );
}
