'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ArchiveProjectCard } from '@/components/ui';
import { Footer, NavBar, TabBar } from '@/components/layout';
import { cn } from '@/lib/utils';

type ArchiveFilters = {
  years: Array<{ yearId: string; year: number }>;
  categories: Array<{ categoryId: string; category: string }>;
};

type ArchiveProject = {
  projectId: string;
  teamId: string;
  teamName: string;
  title: string;
  thumbnailUrl: string;
  isScrap: boolean;
};

type ArchiveSection = {
  yearId: string;
  year: number;
  categoryId: string;
  category: string;
  projects: ArchiveProject[];
};

type ArchiveListResponse = {
  status: 'success';
  data: {
    filters: ArchiveFilters;
    selectedFilters: {
      yearId: string | null;
      categoryId: string | null;
    };
    sections: ArchiveSection[];
  };
};

type ErrorResponse = {
  status: 'error';
  code?: string;
  message?: string;
};

function ArchiveHeroTabs() {
  return (
    <section className="mx-auto w-full max-w-[375px] px-4 pt-3">
      <div className="relative overflow-hidden rounded-t-xl bg-orange-5 px-5 pb-5 pt-4">
        <div className="absolute -right-1 top-0 h-20 w-28 rounded-bl-[20px] bg-orange-3/70" />
        <div className="relative">
          <h1 className="typo-heading-large text-neutral-2">Archive</h1>
          <p className="mt-1 text-[9px] leading-[1.4] text-orange-1">GCS의 팀과 기록을 만나보세요.</p>
        </div>
      </div>
      <div className="flex h-10 items-end rounded-b-xl bg-neutral-4 px-6">
        <button type="button" className="relative h-full px-8 typo-body-small-bold text-orange-5" aria-current="page">
          Project
          <span className="absolute inset-x-0 bottom-0 h-0.5 bg-orange-5" />
        </button>
        <button type="button" className="h-full px-8 typo-body-small text-neutral-6" disabled>
          News
        </button>
      </div>
    </section>
  );
}

function FilterDropdown({
  label,
  value,
  placeholder,
  items,
  onSelect,
  open,
  onToggle,
}: {
  label: 'year' | 'category';
  value?: string;
  placeholder: string;
  items: Array<{ id: string; label: string }>;
  onSelect: (value?: string) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) {
        onToggle();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, onToggle]);

  return (
    <div className="relative min-w-0 flex-1" ref={boxRef}>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'flex h-[30px] w-full items-center justify-between rounded-[4px] border bg-neutral-2 px-3',
          open ? 'border-orange-5' : 'border-neutral-5'
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
      >
        <span className={cn('truncate text-[11px] leading-[1.5]', value ? 'text-neutral-10' : 'text-neutral-6')}>
          {value ?? placeholder}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          className={cn('transition-transform', open && 'rotate-180')}
          aria-hidden
        >
          <path d="M4 5.5L7 8.5L10 5.5" stroke={open ? '#F6874C' : '#999694'} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div className="absolute left-0 top-[34px] z-20 w-full overflow-hidden rounded-[4px] border border-neutral-4 bg-neutral-2 shadow-[0_2px_8px_rgba(47,40,36,0.12)]">
          <button
            type="button"
            className="flex h-9 w-full items-center px-3 text-left text-[11px] leading-[1.5] text-neutral-8 hover:bg-neutral-4"
            onClick={() => {
              onSelect(undefined);
              onToggle();
            }}
          >
            전체
          </button>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="flex h-9 w-full items-center px-3 text-left text-[11px] leading-[1.5] text-neutral-10 hover:bg-neutral-4"
              onClick={() => {
                onSelect(item.id);
                onToggle();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function ArchivePage() {
  const { data: session, status } = useSession();
  const isAdmin = status === 'authenticated' && session?.user?.role === 'admin';
  const [yearId, setYearId] = useState<string | undefined>();
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [openDropdown, setOpenDropdown] = useState<'year' | 'category' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ArchiveListResponse['data'] | null>(null);

  const selectedYearLabel = useMemo(
    () => data?.filters.years.find((item) => item.yearId === yearId)?.year?.toString(),
    [data, yearId]
  );
  const selectedCategoryLabel = useMemo(
    () => data?.filters.categories.find((item) => item.categoryId === categoryId)?.category,
    [data, categoryId]
  );

  useEffect(() => {
    let ignore = false;

    const fetchArchive = async () => {
      setLoading(true);
      setError(null);

      const qs = new URLSearchParams();
      if (yearId) qs.set('yearId', yearId);
      if (categoryId) qs.set('categoryId', categoryId);

      try {
        const res = await fetch(`/api/v1/archive/projects${qs.toString() ? `?${qs.toString()}` : ''}`, {
          cache: 'no-store',
        });
        const json = (await res.json()) as ArchiveListResponse | ErrorResponse;

        if (!res.ok || json.status !== 'success') {
          const message = (json as ErrorResponse).message ?? '아카이브 프로젝트를 불러오지 못했습니다.';
          throw new Error(message);
        }

        if (!ignore) {
          setData(json.data);
        }
      } catch (e) {
        if (!ignore) {
          setData(null);
          setError(e instanceof Error ? e.message : '서버 오류가 발생했습니다.');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    void fetchArchive();

    return () => {
      ignore = true;
    };
  }, [yearId, categoryId]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-neutral-3">
      <NavBar />
      <ArchiveHeroTabs />

      <main className="mx-auto w-full max-w-[375px] flex-1 bg-neutral-3">
        <section className="px-4 py-3">
          <div className="flex gap-2">
            <FilterDropdown
              label="year"
              placeholder="연도"
              value={selectedYearLabel}
              items={(data?.filters.years ?? []).map((item) => ({ id: item.yearId, label: String(item.year) }))}
              open={openDropdown === 'year'}
              onToggle={() => setOpenDropdown((prev) => (prev === 'year' ? null : 'year'))}
              onSelect={setYearId}
            />
            <FilterDropdown
              label="category"
              placeholder="카테고리"
              value={selectedCategoryLabel}
              items={(data?.filters.categories ?? []).map((item) => ({ id: item.categoryId, label: item.category }))}
              open={openDropdown === 'category'}
              onToggle={() => setOpenDropdown((prev) => (prev === 'category' ? null : 'category'))}
              onSelect={setCategoryId}
            />
          </div>
        </section>

        {loading ? (
          <div className="px-4 py-12 text-center typo-body-small text-neutral-7">프로젝트를 불러오는 중입니다.</div>
        ) : error ? (
          <div className="px-4 py-12 text-center typo-body-small text-red-500">{error}</div>
        ) : (data?.sections.length ?? 0) === 0 ? (
          <div className="px-4 py-12 text-center typo-body-small text-neutral-7">조건에 맞는 프로젝트가 없습니다.</div>
        ) : (
          <div className="pb-6">
            {data?.sections.map((section) => (
              <section key={`${section.yearId}:${section.categoryId}`} className="mb-6 bg-neutral-4 py-4">
                <div className="px-4">
                  <p className="mb-3 text-[11px] leading-[1.5] text-neutral-8">
                    {section.year} | {section.category}
                  </p>
                </div>

                <div className="space-y-8 px-4">
                  {section.projects.map((project) => (
                    <ArchiveProjectCard
                      key={project.projectId}
                      projectId={project.projectId}
                      title={project.title}
                      teamName={project.teamName}
                      thumbnailUrl={project.thumbnailUrl}
                      href={`/archive/projects/${project.projectId}`}
                      className="mx-auto max-w-[270px]"
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <div className="sticky bottom-0 z-20">
        <TabBar variant="archive" />
      </div>
      <Footer showAdminButton={isAdmin} />
    </div>
  );
}

