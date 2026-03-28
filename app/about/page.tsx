'use client';

import { Banner, BottomTabBar, Footer, NavBar } from '@/components/layout';
import EmptyviewText from '@/components/ui/common/EmptyviewText';
import TabBar from '@/components/ui/button/TabBar';
import { useState } from 'react';

const aboutTabItems = [
  { key: 'site', title: '사이트 소개' },
  { key: 'major', title: '전공 소개' },
  { key: 'curriculum', title: '커리큘럼' },
  { key: 'professor', title: '교수진' },
];

export default function AboutPage() {
  const [activeSection, setActiveSection] = useState('major');

  return (
    <div className="min-h-screen bg-neutral-3">
      <div className="mx-auto flex min-h-screen w-full max-w-[375px] flex-col bg-neutral-3">
        <NavBar />
        <Banner variant="about" />

        <TabBar
          items={aboutTabItems}
          activeKey={activeSection}
          onChange={setActiveSection}
          className="bg-neutral-3 py-0"
        />

        <main className="flex-1">
          <section className="flex h-[507px] items-center justify-center">
            <EmptyviewText
              title="Comming Soon!"
              subtitle="About GCS는 추후 오픈 예정입니다."
              className="w-[307px]"
            />
          </section>
        </main>

        <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[375px] -translate-x-1/2">
          <BottomTabBar variant="about" />
        </div>
        <div className="pb-[74px]">
          <Footer />
        </div>
      </div>
    </div>
  );
}
