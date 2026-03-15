'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BottomTabBar, Footer, NavBar } from '@/components/layout';

const heroImage = 'https://www.figma.com/api/mcp/asset/1a720de9-5732-4c38-ae25-95524116dcf8';
const buyNowImage = 'https://www.figma.com/api/mcp/asset/72665abd-f79d-4bc3-94f9-8df2cbcfea9b';
const fundImage = 'https://www.figma.com/api/mcp/asset/9983a939-eee0-4ed8-8d6b-dcd56141bc90';
const instagramIcon = 'https://www.figma.com/api/mcp/asset/a756b379-dc78-4e02-a871-1c61f7baef6a';

function SectionTitle({ title, href }: { title: string; href: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-0.5">
      <span className="typo-heading-xsmall text-orange-4">{title}</span>
      <span className="text-[18px] leading-none text-orange-4">{'>'}</span>
    </Link>
  );
}

function ProductCard({
  image,
  title,
  subtitle,
  badge,
}: {
  image: string;
  title: string;
  subtitle: string;
  badge: string;
}) {
  return (
    <article className="w-[269px] shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt={title} className="aspect-[1080/1350] w-full rounded-[8px] object-cover shadow-[0_0_5px_0_rgba(0,0,0,0.2)]" />
      <div className="mt-4 flex flex-col gap-2">
        <span className="inline-flex h-[20px] w-fit items-center rounded-[4px] bg-neutral-5 px-[5px] text-[13px] tracking-[-0.26px] text-neutral-9">
          {badge}
        </span>
        <div className="h-px w-full bg-neutral-4" />
        <div className="pt-1">
          <p className="typo-heading-xsmall text-neutral-12">{title}</p>
          <p className="typo-body-small text-neutral-8">{subtitle}</p>
        </div>
      </div>
    </article>
  );
}

function SlideCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        aria-label="이전"
        className="inline-flex h-6 w-6 items-center justify-center text-neutral-6"
      >
        <span className="text-[28px] leading-none">{'‹'}</span>
      </button>
      {children}
      <button
        type="button"
        aria-label="다음"
        className="inline-flex h-6 w-6 items-center justify-center text-[#FAC0A1]"
      >
        <span className="text-[28px] leading-none">{'›'}</span>
      </button>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-neutral-3">
      <div className="mx-auto flex min-h-screen w-full max-w-[375px] flex-col bg-neutral-3">
        <NavBar />

        <main className="flex-1">
          <section className="px-4 pt-[18px]">
            <p className="typo-body-small text-orange-5">2026 불교박람회</p>
            <h1 className="mt-1 text-[24px] font-bold leading-[1.5] text-orange-5">이번 역은 열반, 열반역 입니다.</h1>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImage}
              alt="열반급행 메인 포스터"
              className="mt-5 h-[429px] w-full rounded-[8px] object-cover shadow-[0_0_5px_0_rgba(0,0,0,0.2)]"
            />

            <a
              href="https://www.instagram.com/"
              target="_blank"
              rel="noreferrer"
              className="mx-auto mb-8 mt-[19px] flex h-[29px] w-fit items-center gap-1 rounded-[5px] border border-orange-3 bg-neutral-2 px-2 text-[15px] text-neutral-8"
            >
              열반급행 부스를 확인해보세요!
              <Image src={instagramIcon} alt="" width={22} height={22} />
            </a>
          </section>

          <div className="mb-2 bg-neutral-3 px-4 pt-4">
            <SectionTitle title="Buy Now" href="/shop?type=buyNow" />
          </div>
          <section className="bg-neutral-2 px-4 pb-7 pt-6">
            <div>
              <SlideCard>
                <ProductCard image={buyNowImage} badge="D-5" title="염소 후드집업" subtitle="팀 이름" />
              </SlideCard>
            </div>
          </section>

          <div className="mb-2 bg-neutral-3 px-4 pt-4">
            <SectionTitle title="Fund" href="/shop?type=fund" />
          </div>
          <section className="bg-neutral-2 px-4 pb-7 pt-6">
            <div>
              <SlideCard>
                <ProductCard image={fundImage} badge="D-5" title="염소 후드집업" subtitle="팀 이름" />
              </SlideCard>
              <div className="mx-auto mt-3 w-[269px]">
                <div className="mb-[10px] flex items-center justify-between text-[13px] text-neutral-8 tracking-[-0.26px]">
                  <div className="flex items-center gap-[6px]">
                    <span className="inline-flex h-[17px] items-center rounded-[4px] bg-neutral-5 px-[5px] text-[11px] text-neutral-9">미달성</span>
                    <span>70%</span>
                  </div>
                  <span>570,000원</span>
                </div>
                <div className="h-[7px] rounded-[3.5px] border border-neutral-5 bg-[#f8f6f4]">
                  <div className="h-full w-[70%] rounded-[3.5px] bg-[#efddc9]" />
                </div>
              </div>
            </div>
          </section>

          <Footer />
        </main>

        <div className="sticky bottom-0 z-20 mt-auto">
          <BottomTabBar variant="home" />
        </div>
      </div>
    </div>
  );
}
