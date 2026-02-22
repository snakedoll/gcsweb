'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { NavBar } from '@/components/layout';
import UISearchBar from '@/components/ui/SearchBar';
import FloatingButton from '@/components/ui/button/FloatingButton';
import ToastMessage from '@/components/ui/ToastMessage';
import { FilterArea, Listedcard } from '@/components/ui/project';
import { cn } from '@/lib/utils';

type FilterState = {
  years: string[];
  categories: string[];
};

const YEAR_OPTIONS = ['2026', '2025', '2024', '...'];
const CATEGORY_OPTIONS = ['1', '2', '3', '...'];

function toggleSelectable(values: string[], target: string) {
  if (target === '...') return values;
  return values.includes(target) ? values.filter((value) => value !== target) : [...values, target];
}

export default function AdminProjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterState, setFilterState] = useState<FilterState>({ years: [], categories: [] });

  const selectedChips = useMemo(() => [...filterState.years, ...filterState.categories], [filterState]);

  const handleToggleYear = (value: string) => {
    setFilterState((prev) => ({ ...prev, years: toggleSelectable(prev.years, value) }));
  };

  const handleToggleCategory = (value: string) => {
    setFilterState((prev) => ({ ...prev, categories: toggleSelectable(prev.categories, value) }));
  };

  const handleRemoveChip = (value: string) => {
    setFilterState((prev) => ({
      years: prev.years.filter((item) => item !== value),
      categories: prev.categories.filter((item) => item !== value),
    }));
  };

  const handleReset = () => {
    setFilterState({ years: [], categories: [] });
  };

  const toastKey = searchParams.get('toast');
  const toastMessage =
    toastKey === 'project-created-private'
      ? '프로젝트가 비공개 등록되었습니다.'
      : toastKey === 'project-created-public'
        ? '프로젝트가 공개 등록되었습니다.'
        : null;

  return (
    <div className="min-h-screen bg-neutral-3 font-pretendard">
      <div className="mx-auto w-full max-w-[375px] bg-neutral-3">
        <NavBar variant="title-back" title="Project 관리" />

        <main className="px-4 pt-4 pb-12">
          <div className="flex flex-col gap-6">
            {toastMessage ? <ToastMessage message={toastMessage} /> : null}

            <div className="flex flex-col gap-3">
              <UISearchBar placeholder="제목, 팀명으로 검색..." value={search} onChange={setSearch} />

              <FilterArea
                className="w-full"
                isFilterOpen={isFilterOpen}
                sortValue={isFilterOpen ? '조회순' : undefined}
                visibilityValue={isFilterOpen ? '공개' : undefined}
                years={YEAR_OPTIONS}
                categories={CATEGORY_OPTIONS}
                selectedYears={filterState.years}
                selectedCategories={filterState.categories}
                selectedChips={selectedChips}
                onToggleFilter={() => setIsFilterOpen((prev) => !prev)}
                onToggleYear={handleToggleYear}
                onToggleCategory={handleToggleCategory}
                onRemoveChip={handleRemoveChip}
                onReset={handleReset}
              />
            </div>

            <section className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-6 typo-body-xsmall text-neutral-8">
                <div className="flex items-center gap-1">
                  <span className="font-semibold">전체 프로젝트</span>
                  <span>6</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold">총 조회수</span>
                  <span>6</span>
                </div>
              </div>

              <div className="w-full space-y-3">
                <Listedcard
                  className="w-full"
                  property1="project_post"
                  imageSrc="/assets/images/profile_image.png"
                  brand="팀명"
                  title="프로젝트 제목"
                  projectTags={['2025', '겨울 공모전']}
                  postedAt="2025.01.04 15:13"
                  views={393}
                  likeCount={17}
                  publicExpose
                  publicStatusText="공개"
                />
                <Listedcard
                  className="w-full"
                  property1="project_post"
                  imageSrc="/assets/images/profile_image.png"
                  brand="팀명"
                  title="프로젝트 제목"
                  projectTags={['2025', '겨울 공모전']}
                  postedAt="2025.01.04 15:13"
                  views={393}
                  likeCount={17}
                  publicExpose
                  publicStatusText="공개"
                />
              </div>
            </section>
          </div>
        </main>
      </div>

      <div className={cn('fixed left-1/2 z-20 ml-[142px] -translate-x-1/2', isFilterOpen ? 'bottom-8' : 'bottom-8')}>
        <FloatingButton onClick={() => router.push('/admin/project/new')} />
      </div>
    </div>
  );
}

