'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { NavBar } from '@/components/layout';
import UISearchBar from '@/components/ui/common/SearchBar';
import FloatingButton from '@/components/ui/button/FloatingButton';
import ToastMessage from '@/components/ui/common/ToastMessage';
import { FilterArea, ProjectCard } from '@/components/ui/admin/project';
import { cn } from '@/lib/utils';

type FilterState = {
  years: string[];
  categories: string[];
};

type ProjectListItem = {
  id: string;
  teamName: string;
  title: string;
  year: string;
  category: string;
  thumbnailUrl: string;
  isPublic: boolean;
  isHome: boolean;
  likeCount: number;
  viewCount: number;
  createdAt: string;
};

const YEAR_OPTIONS = ['2026', '2025', '2024', '...'];
const CATEGORY_OPTIONS = ['1', '2', '3', '...'];

function toggleSelectable(values: string[], target: string) {
  if (target === '...') return values;
  return values.includes(target) ? values.filter((value) => value !== target) : [...values, target];
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${yy}.${mm}.${dd} ${hh}:${mi}`;
}

export default function AdminProjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterState, setFilterState] = useState<FilterState>({ years: [], categories: [] });
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [updatingProjectIds, setUpdatingProjectIds] = useState<string[]>([]);

  const selectedChips = useMemo(() => [...filterState.years, ...filterState.categories], [filterState]);

  const filteredProjects = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return projects;

    return projects.filter((project) =>
      [project.title, project.teamName].some((value) => String(value ?? '').toLowerCase().includes(keyword))
    );
  }, [projects, search]);

  const summary = useMemo(
    () => ({
      totalProjectCount: filteredProjects.length,
      totalViewCount: filteredProjects.reduce((acc, project) => acc + Number(project.viewCount ?? 0), 0),
    }),
    [filteredProjects]
  );

  const hasProjects = filteredProjects.length > 0;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/v1/admin/project/list', { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));

        if (!res.ok || json?.status !== 'success') {
          throw new Error(json?.message ?? '프로젝트 목록을 불러오지 못했습니다.');
        }

        if (cancelled) return;
        setProjects((json.data?.projects ?? []) as ProjectListItem[]);
      } catch (error) {
        console.error(error);
        if (!cancelled) setProjects([]);
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setProjectUpdating = (projectId: string, updating: boolean) => {
    setUpdatingProjectIds((prev) =>
      updating ? (prev.includes(projectId) ? prev : [...prev, projectId]) : prev.filter((id) => id !== projectId)
    );
  };

  const patchProjectFlag = async (
    projectId: string,
    kind: 'home' | 'public',
    nextValue: boolean
  ) => {
    const prevProjects = projects;
    const field = kind === 'home' ? 'isHome' : 'isPublic';

    setProjectUpdating(projectId, true);
    setProjects((prev) =>
      prev.map((project) => (project.id === projectId ? { ...project, [field]: nextValue } : project))
    );

    try {
      const res = await fetch(`/api/v1/admin/project/${projectId}/${kind}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          [kind === 'home' ? 'isHome' : 'isPublic']: nextValue,
        }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.status !== 'success') {
        throw new Error(json?.message ?? '프로젝트 상태 변경에 실패했습니다.');
      }
    } catch (error: any) {
      console.error(error);
      setProjects(prevProjects);
      alert(error?.message ?? '프로젝트 상태 변경에 실패했습니다.');
    } finally {
      setProjectUpdating(projectId, false);
    }
  };

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
        : toastKey === 'project-updated'
          ? '프로젝트가 수정되었습니다.'
          : toastKey === 'project-deleted'
            ? '프로젝트가 삭제되었습니다.'
            : null;

  return (
    <div className="min-h-screen bg-neutral-3 font-pretendard">
      <div className="mx-auto w-full max-w-[375px] bg-neutral-3">
        <NavBar variant="title-back" title="Project 관리" onBack={() => router.push('/admin')} />

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
                  <span>{summary.totalProjectCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold">총 조회수</span>
                  <span>{summary.totalViewCount}</span>
                </div>
              </div>

              {hasProjects ? (
                <div className="w-full space-y-3">
                  {filteredProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      className="w-full"
                      onContentClick={() => router.push(`/admin/project/${project.id}/edit`)}
                      imageSrc={project.thumbnailUrl || '/assets/images/profile_image.png'}
                      brand={project.teamName || '팀명'}
                      title={project.title || '프로젝트 제목'}
                      projectTags={[project.year, project.category].filter(Boolean)}
                      postedAt={formatDateTime(project.createdAt)}
                      views={Number(project.viewCount ?? 0)}
                      likeCount={Number(project.likeCount ?? 0)}
                      publicExpose={Boolean(project.isHome)}
                      publicChecked={Boolean(project.isPublic)}
                      publicStatusText="공개"
                      actionDisabled={updatingProjectIds.includes(project.id)}
                      onHomeExposeChange={(checked) => void patchProjectFlag(project.id, 'home', checked)}
                      onPublicChange={(checked) => void patchProjectFlag(project.id, 'public', checked)}
                    />
                  ))}
                </div>
              ) : listLoading ? (
                <div className="flex min-h-[calc(100vh-340px)] w-full items-center justify-center px-4 text-center">
                  <p className="typo-heading-small text-neutral-12">불러오는 중...</p>
                </div>
              ) : (
                <div className="flex min-h-[calc(100vh-340px)] w-full items-center justify-center px-4 text-center">
                  <p className="typo-heading-small text-neutral-12">등록된 프로젝트가 없습니다.</p>
                </div>
              )}
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
