'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banner, Footer, NavBar } from '@/components/layout';
import { ArchiveCard1, DashboardHeaderTitle, Dropdown, Tab } from '@/components/ui';

type ArchiveFilterOption = {
  yearId?: string;
  year?: number;
  categoryId?: string;
  category?: string;
};

type ArchiveSectionProject = {
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
  projects: ArchiveSectionProject[];
};

type ArchiveListResponse = {
  status: 'success' | 'error';
  data?: {
    filters: {
      years: Array<{ yearId: string; year: number }>;
      categories: Array<{ categoryId: string; category: string }>;
    };
    selectedFilters: {
      yearId: string | null;
      categoryId: string | null;
    };
    sections: ArchiveSection[];
  };
  message?: string;
};

function ProjectNewsTabs() {
  return (
    <div className="flex w-full items-center">
      <div className="h-[43px] w-4 border-b border-neutral-4" />
      <Tab title="Project" active className="flex-1" />
      <Tab title="News" active={false} className="flex-1" />
      <div className="h-[43px] w-4 border-b border-neutral-4" />
    </div>
  );
}

function ArchiveListSkeleton() {
  return (
    <div className="flex flex-col gap-6 px-4 pb-10">
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-xl border border-neutral-4 bg-white">
          <div className="h-7 w-28 animate-pulse rounded bg-neutral-4/70" />
          <div className="mt-3 h-[430px] animate-pulse bg-neutral-3" />
        </div>
      ))}
    </div>
  );
}

export default function ArchivePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sections, setSections] = useState<ArchiveSection[]>([]);
  const [years, setYears] = useState<Array<{ yearId: string; year: number }>>([]);
  const [categories, setCategories] = useState<Array<{ categoryId: string; category: string }>>([]);
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [sectionIndices, setSectionIndices] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const params = new URLSearchParams();
        if (selectedYearId) params.set('yearId', selectedYearId);
        if (selectedCategoryId) params.set('categoryId', selectedCategoryId);

        const qs = params.toString();
        const res = await fetch(`/api/v1/archive/projects${qs ? `?${qs}` : ''}`, {
          cache: 'no-store',
        });
        const json = (await res.json().catch(() => ({}))) as ArchiveListResponse;

        if (!res.ok || json.status !== 'success' || !json.data) {
          throw new Error(json.message ?? '아카이브 프로젝트를 불러오지 못했습니다.');
        }

        if (cancelled) return;

        setSections(json.data.sections ?? []);
        setYears(json.data.filters?.years ?? []);
        setCategories(json.data.filters?.categories ?? []);
        setSectionIndices((prev) => {
          const next: Record<string, number> = {};
          for (const section of json.data?.sections ?? []) {
            const key = `${section.yearId}::${section.categoryId}`;
            const maxIndex = Math.max((section.projects?.length ?? 1) - 1, 0);
            next[key] = Math.min(prev[key] ?? 0, maxIndex);
          }
          return next;
        });
      } catch (error: any) {
        console.error(error);
        if (!cancelled) {
          setSections([]);
          setErrorMessage(error?.message ?? '아카이브 프로젝트를 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [selectedYearId, selectedCategoryId]);

  const yearDropdownItems = useMemo(
    () => [
      { label: '전체', value: '' },
      ...years.map((item) => ({ label: String(item.year), value: item.yearId })),
    ],
    [years]
  );

  const categoryDropdownItems = useMemo(
    () => [
      { label: '전체', value: '' },
      ...categories.map((item) => ({ label: item.category, value: item.categoryId })),
    ],
    [categories]
  );

  const selectedYearLabel = useMemo(() => {
    const match = years.find((item) => item.yearId === selectedYearId);
    return match ? String(match.year) : undefined;
  }, [years, selectedYearId]);

  const selectedCategoryLabel = useMemo(() => {
    const match = categories.find((item) => item.categoryId === selectedCategoryId);
    return match?.category;
  }, [categories, selectedCategoryId]);

  const rotateSection = (section: ArchiveSection, direction: -1 | 1) => {
    const key = `${section.yearId}::${section.categoryId}`;
    const total = section.projects.length;
    if (total <= 1) return;

    setSectionIndices((prev) => {
      const current = prev[key] ?? 0;
      const nextIndex = (current + direction + total) % total;
      return { ...prev, [key]: nextIndex };
    });
  };

  return (
    <div className="min-h-screen bg-neutral-3">
      <div className="mx-auto flex min-h-screen w-full max-w-[375px] flex-col bg-neutral-3">
        <NavBar />
        <Banner variant="archive" />

        <main className="flex-1">
          <section className="border-b border-neutral-4 bg-neutral-3">
            <ProjectNewsTabs />
            <div className="flex items-center gap-[9px] px-4 py-[10px]">
              <Dropdown
                className="w-[110px]"
                label=""
                placeholder="연도"
                value={selectedYearLabel}
                items={yearDropdownItems}
                onSelect={(value) => setSelectedYearId(value || null)}
              />
              <Dropdown
                className="w-[110px]"
                label=""
                placeholder="카테고리"
                value={selectedCategoryLabel}
                items={categoryDropdownItems}
                onSelect={(value) => setSelectedCategoryId(value || null)}
              />
            </div>
          </section>

          <section className="py-5">
            {loading ? (
              <ArchiveListSkeleton />
            ) : errorMessage ? (
              <div className="px-4 py-12 text-center text-[13px] leading-[1.5] text-neutral-7">
                {errorMessage}
              </div>
            ) : sections.length === 0 ? (
              <div className="px-4 py-12 text-center text-[13px] leading-[1.5] text-neutral-7">
                조건에 맞는 프로젝트가 없습니다.
              </div>
            ) : (
              <div className="flex flex-col gap-[30px]">
                {sections.map((section) => {
                  const key = `${section.yearId}::${section.categoryId}`;
                  const currentIndex = sectionIndices[key] ?? 0;
                  const project = section.projects[currentIndex];
                  if (!project) return null;

                  return (
                    <section key={key} className="flex flex-col gap-[6px]">
                      <div className="px-4">
                        <DashboardHeaderTitle year={section.year} category={section.category} />
                      </div>

                      <ArchiveCard1
                        title={project.title}
                        subtitle={project.teamName}
                        imageSrc={project.thumbnailUrl}
                        onCardClick={() => router.push(`/archive/projects/${project.projectId}`)}
                        cardAriaLabel={`${project.title} 상세 페이지로 이동`}
                        onPrevClick={() => rotateSection(section, -1)}
                        onNextClick={() => rotateSection(section, 1)}
                        disablePrev={section.projects.length <= 1}
                        disableNext={section.projects.length <= 1}
                      />
                    </section>
                  );
                })}
              </div>
            )}
          </section>
        </main>

        <Footer showAdminButton />
      </div>
    </div>
  );
}
