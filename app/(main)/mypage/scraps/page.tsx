'use client';

import { Footer, NavBar } from '@/components/layout';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

/* ─────────────── 타입 ─────────────── */
type ScrapTab = 'Project' | 'Board' | 'Lounge';

interface ScrapProject {
  id: string;
  teamName: string | null;
  title: string;
  thumbnailUrl: string | null;
  keywords: string[];
}



/* ─────────────── 카드 ─────────────── */
function ProjectCard({ item }: { item: ScrapProject }) {
  return (
    <Link href={`/projects/${item.id}`} className="flex items-start gap-[15px] w-full">
      {/* 썸네일: likes 카드와 동일한 70×87 (4:5 비율) */}
      <div
        className="relative shrink-0 rounded-[5.333px] overflow-hidden bg-[#dddcdb]"
        style={{ width: 70, height: 87 }}
      >
        {item.thumbnailUrl ? (
          <Image src={item.thumbnailUrl} alt={item.title} fill className="object-cover" sizes="70px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="#999694" strokeWidth="1.2" />
              <circle cx="8.5" cy="8.5" r="1.5" fill="#999694" />
              <path d="M3 15L8 10L12 14L15 11L21 17" stroke="#999694" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>

      {/* 텍스트 + 화살표 */}
      <div className="flex flex-1 items-center min-w-0 gap-3">
        <div className="flex flex-1 flex-col gap-3 min-w-0">
          {/* 브랜드명 + 제목 */}
          <div className="flex flex-col gap-1">
            <p className="text-[13px] font-semibold leading-[1.5] tracking-[-0.26px] text-[#1a1918] truncate">
              {item.teamName ?? ''}
            </p>
            <p className="text-[15px] leading-[1.5] text-[#1a1918] truncate">
              {item.title}
            </p>
          </div>

          {/* 키워드 태그 */}
          {item.keywords.length > 0 && (
            <div className="flex items-start gap-2 flex-wrap">
              {item.keywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center justify-center px-[8px] py-[2px] rounded-[8px] bg-[#fac0a1] text-[#cf5d1f] text-[13px] leading-[1.5] tracking-[-0.26px]"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 우측 화살표 */}
        <svg className="shrink-0" width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M9 18L15 12L9 6" stroke="#999694" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </Link>
  );
}

/* ─────────────── 탭 바 ─────────────── */
const TABS: ScrapTab[] = ['Project', 'Board', 'Lounge'];

function TabBar({ active, onChange }: { active: ScrapTab; onChange: (t: ScrapTab) => void }) {
  return (
    <div className="flex items-center w-full">
      {/* 좌측 spacer */}
      <div className="w-4 shrink-0 h-[43px]" />
      {TABS.map((tab) => {
        const isActive = tab === active;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            className={[
              'flex-1 h-[43px] flex items-center justify-center px-1 border-b-2 text-[13px] font-semibold leading-[1.5] tracking-[-0.26px] transition-colors',
              isActive
                ? 'border-[#f6874c] text-[#f6874c]'
                : 'border-transparent text-[#c7c5c4]',
            ].join(' ')}
          >
            {tab}
          </button>
        );
      })}
      {/* 우측 spacer */}
      <div className="w-4 shrink-0 h-[43px]" />
    </div>
  );
}

/* ─────────────── 메인 페이지 ─────────────── */
export default function MypageScrapsPage() {
  const [activeTab, setActiveTab] = useState<ScrapTab>('Project');
  const [projects, setProjects] = useState<ScrapProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab !== 'Project') {
      setProjects([]);
      setLoading(false);
      return;
    }

    const fetchScraps = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/v1/mypage/scraps/project?page=1&size=50');
        if (!res.ok) throw new Error('fetch failed');
        const json = await res.json();
        const data: ScrapProject[] = json?.data?.projects ?? [];
        setProjects(data);
      } catch {
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchScraps();
  }, [activeTab]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f8f6f4]">
      <NavBar variant="title-back" title="스크랩" />

      {/* 탭 바 */}
      <div className="w-full border-b border-[#f1f1f1]">
        <div className="mx-auto w-full max-w-[375px]">
          <TabBar active={activeTab} onChange={setActiveTab} />
        </div>
      </div>

      {/* 본문 */}
      <main className="mx-auto w-full max-w-[375px] flex-1 flex flex-col px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-[13px] text-[#999694]">로딩 중...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-[13px] text-[#999694]">스크랩한 {activeTab} 항목이 없습니다.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {projects.map((item) => (
              <ProjectCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
