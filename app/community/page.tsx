'use client';

import { BottomTabBar, Footer, NavBar } from '@/components/layout';
import TabBar from '@/components/ui/button/TabBar';
import EmptyviewText from '@/components/ui/common/EmptyviewText';
import { useState } from 'react';

const communityTabItems = [
  { key: 'board', title: 'Board' },
  { key: 'lounge', title: 'Lounge' },
];

function CommunityBanner() {
  return (
    <section className="flex h-[113px] w-full items-end bg-orange-5 px-[11px]">
      <div className="flex h-[94px] w-full flex-col items-start rounded-t-[9px] bg-neutral-1 px-[17px]">
        <div className="flex h-[94px] w-full items-start justify-center gap-2.5 pt-[10px]">
          <div className="flex w-[170px] flex-col items-start">
            <div className="flex w-full flex-col items-center justify-center gap-[3px] pt-[10px] text-center">
              <p className="h-[37px] w-full text-[28px] font-bold leading-[1.5] text-orange-5">Community</p>
              <p className="w-full text-[11px] leading-[1.5] text-orange-5">comming soon!</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function CommunityPage() {
  const [activeSection, setActiveSection] = useState('board');

  return (
    <div className="min-h-screen bg-neutral-3">
      <div className="mx-auto w-full max-w-[375px] bg-neutral-3">
        <NavBar />
        <CommunityBanner />

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
            subtitle="커뮤니티 기능은 추후 오픈 예정입니다."
          />
        </section>

        <BottomTabBar variant="community" />
        <Footer />
      </div>
    </div>
  );
}
