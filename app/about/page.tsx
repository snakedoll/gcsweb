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
      <div className="mx-auto w-full max-w-[375px] bg-neutral-3">
        <NavBar />
        <Banner variant="archive" />

        <TabBar
          items={aboutTabItems}
          activeKey={activeSection}
          onChange={setActiveSection}
          className="bg-neutral-3 py-0"
        />

        <section className="flex h-[510px] items-start justify-center pt-[206px]">
          <EmptyviewText title="Comming Soon!" subtitle="커밍숭다리" className="w-[307px]" />
        </section>

        <BottomTabBar variant="about" />
        <Footer />
      </div>
    </div>
  );
}
