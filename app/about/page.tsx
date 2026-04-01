'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Banner, BottomTabBar, Footer, NavBar } from '@/components/layout';
import TabBar from '@/components/ui/button/TabBar';
import EmptyviewText from '@/components/ui/common/EmptyviewText';

const aboutTabItems = [
  { key: 'site', title: '사이트 소개' },
  { key: 'major', title: '전공 소개' },
  { key: 'curriculum', title: '커리큘럼' },
  { key: 'professor', title: '교수진' },
];

export default function AboutPage() {
  const [activeSection, setActiveSection] = useState('site');

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
          {activeSection === 'site' ? (
            <section className="flex flex-col items-center gap-8 px-4 pb-6 pt-8">
              <div className="flex w-full items-start justify-center gap-3">
                <div className="relative h-[110px] w-[110px] overflow-hidden rounded-[4px]">
                  <Image
                    src="/assets/images/about-site-1.svg"
                    alt="GCS 행사 현장"
                    fill
                    sizes="110px"
                    className="object-cover"
                  />
                </div>
                <div className="relative h-[110px] w-[110px] overflow-hidden rounded-[4px]">
                  <Image
                    src="/assets/images/about-site-2.svg"
                    alt="GCS 발표 현장"
                    fill
                    sizes="110px"
                    className="object-cover"
                  />
                </div>
                <div className="relative h-[110px] w-[110px] overflow-hidden rounded-[4px]">
                  <Image
                    src="/assets/images/about-site-3.svg"
                    alt="GCS 작업 공간"
                    fill
                    sizes="110px"
                    className="object-cover"
                  />
                </div>
              </div>

              <div className="flex w-full flex-col gap-11">
                <p className="typo-body-xsmall text-neutral-9">
                  <strong className="font-bold">GCS:Web</strong>은{' '}
                  <strong className="font-bold">동국대학교 연계전공 GCS</strong>의 활동 기록을 공유하고,
                  학생들이 직접 기획·제작한 상품들을 판매하는 이커머스형 전공 플랫폼입니다.
                  <br />
                  <br />
                  전공 내에서 이루어지는 프로젝트, 내부 행사 등을 아카이빙하여, GCS 후속 학생들이 창작을
                  발전시키고 확장해나갈 수 있는 기회를 제공하고자 합니다.
                </p>

                <p className="typo-body-xsmall text-neutral-9">
                  <strong className="font-bold">GCS:Web</strong> is an e-commerce platform for the{' '}
                  <strong className="font-bold">
                    Graphic Communication Science (GCS) at Dongguk University.
                  </strong>
                  <br />
                  <br />
                  It serves as a space to share and archive the activities of GCS, while enabling
                  students to produce and sell their own products.
                </p>
              </div>
            </section>
          ) : (
            <section className="flex h-[507px] items-center justify-center">
              <EmptyviewText
                title="Coming Soon!"
                subtitle="준비 중입니다."
                className="w-[307px]"
              />
            </section>
          )}
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
