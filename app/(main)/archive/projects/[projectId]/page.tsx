'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { BottomTabBar, NavBar } from '@/components/layout';
import { ArchiveCard2, ProfileAvatar } from '@/components/ui';

type ProjectMember = {
  userId: string | null;
  role: '대표' | '팀원';
  name: string | null;
  nickname: string | null;
  major: string | null;
  profileImage: string | null;
  isRepresentative: boolean;
};

type ArchiveProjectDetail = {
  projectId: string;
  title: string;
  teamId: string;
  teamName: string;
  yearId: string;
  year: number;
  categoryId: string;
  category: string;
  thumbnailUrl: string;
  detailUrl: string;
  projectUrl: string;
  isScrap: boolean;
  members?: ProjectMember[];
};

type ArchiveProjectDetailResponse = {
  status: 'success' | 'error';
  data?: { project: ArchiveProjectDetail };
  message?: string;
};

type ArchiveSectionProject = {
  projectId: string;
  teamId: string;
  teamName: string;
  title: string;
  thumbnailUrl: string;
  isScrap: boolean;
};

type ArchiveListResponse = {
  status: 'success' | 'error';
  data?: {
    sections: Array<{
      yearId: string;
      year: number;
      categoryId: string;
      category: string;
      projects: ArchiveSectionProject[];
    }>;
  };
  message?: string;
};

function SideArrowButton({
  direction,
  onClick,
  disabled,
}: {
  direction: 'left' | 'right';
  onClick: () => void;
  disabled?: boolean;
}) {
  const isLeft = direction === 'left';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={isLeft ? '이전 프로젝트' : '다음 프로젝트'}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-5 bg-white text-orange-4 disabled:opacity-30"
    >
      <Image
        src={
          isLeft
            ? '/assets/icons/arrow/filled/Iconex/Filled/Left 2.svg'
            : '/assets/icons/arrow/filled/Iconex/Filled/Right 2.svg'
        }
        alt=""
        width={24}
        height={24}
        className="h-6 w-6"
        aria-hidden
      />
    </button>
  );
}

function DetailSkeleton() {
  return (
    <div className="px-4 pt-5 pb-10">
      <div className="h-[560px] animate-pulse rounded-[13px] bg-white" />
    </div>
  );
}

export default function ArchiveProjectDetailPage({
  params,
}: {
  params: { projectId: string };
}) {
  const router = useRouter();
  const projectId = params.projectId;

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [project, setProject] = useState<ArchiveProjectDetail | null>(null);
  const [relatedProjects, setRelatedProjects] = useState<ArchiveSectionProject[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const detailRes = await fetch(`/api/v1/archive/projects/${projectId}`, { cache: 'no-store' });
        const detailJson = (await detailRes.json().catch(() => ({}))) as ArchiveProjectDetailResponse;

        if (!detailRes.ok || detailJson.status !== 'success' || !detailJson.data?.project) {
          throw new Error(detailJson.message ?? '프로젝트 상세를 불러오지 못했습니다.');
        }

        const nextProject = detailJson.data.project;
        if (cancelled) return;
        setProject(nextProject);

        const params = new URLSearchParams();
        if (nextProject.yearId) params.set('yearId', nextProject.yearId);
        if (nextProject.categoryId) params.set('categoryId', nextProject.categoryId);

        const listRes = await fetch(`/api/v1/archive/projects?${params.toString()}`, { cache: 'no-store' });
        const listJson = (await listRes.json().catch(() => ({}))) as ArchiveListResponse;

        if (listRes.ok && listJson.status === 'success') {
          const section = listJson.data?.sections?.find(
            (item) => item.yearId === nextProject.yearId && item.categoryId === nextProject.categoryId
          );
          const projects = section?.projects ?? [];
          if (!cancelled) {
            setRelatedProjects(projects);
            const foundIndex = projects.findIndex((item) => item.projectId === nextProject.projectId);
            setCurrentIndex(foundIndex >= 0 ? foundIndex : 0);
          }
        } else if (!cancelled) {
          setRelatedProjects([]);
          setCurrentIndex(0);
        }
      } catch (error: any) {
        console.error(error);
        if (!cancelled) {
          setProject(null);
          setRelatedProjects([]);
          setErrorMessage(error?.message ?? '프로젝트 상세를 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const members = useMemo(() => (project?.members ?? []).slice(0, 6), [project?.members]);

  const canMoveRelated = relatedProjects.length > 1;

  const moveRelated = (direction: -1 | 1) => {
    if (!canMoveRelated || !project) return;
    const nextIndex = (currentIndex + direction + relatedProjects.length) % relatedProjects.length;
    const next = relatedProjects[nextIndex];
    if (!next) return;
    router.push(`/archive/projects/${next.projectId}`);
  };

  return (
    <div className="min-h-screen bg-neutral-3">
      <div className="mx-auto flex min-h-screen w-full max-w-[375px] flex-col bg-neutral-3">
        <NavBar variant="logo-back" />

        <main className="flex-1 pb-[72px]">
          {loading ? (
            <DetailSkeleton />
          ) : errorMessage || !project ? (
            <div className="px-4 py-16 text-center text-[13px] leading-[1.5] text-neutral-7">
              {errorMessage ?? '프로젝트 정보를 불러오지 못했습니다.'}
            </div>
          ) : (
            <div className="flex flex-col gap-5 pt-5">
              <div className="flex flex-col items-center gap-5">
                <div className="flex items-center gap-2">
                  <SideArrowButton direction="left" onClick={() => moveRelated(-1)} disabled={!canMoveRelated} />
                  <ArchiveCard2
                    title={project.title}
                    subtitle={project.teamName}
                    year={project.year}
                    category={project.category}
                    imageSrc={project.thumbnailUrl}
                    selected={project.isScrap}
                  />
                  <SideArrowButton direction="right" onClick={() => moveRelated(1)} disabled={!canMoveRelated} />
                </div>

                <div className="flex flex-col items-center gap-[13px]">
                  <p className="text-[15px] leading-[1.5] text-neutral-8">
                    {`${project.teamName}에 함께한 팀원들을 알아보세요!`}
                  </p>
                  <div className="flex items-center gap-2">
                    {members.length > 0 ? (
                      members.map((member, index) => (
                        <ProfileAvatar
                          key={`${member.userId ?? member.nickname ?? member.name ?? 'member'}-${index}`}
                          className="h-[47px] w-[47px]"
                          variant="default"
                          name={member.nickname ?? member.name ?? '팀원'}
                          major={member.major ?? undefined}
                          imageSrc="/profile_image.png"
                        />
                      ))
                    ) : (
                      <p className="text-[13px] leading-[1.5] text-neutral-7">등록된 팀원 정보가 없습니다.</p>
                    )}
                  </div>
                </div>

                <div className="w-full overflow-hidden">
                  {project.detailUrl ? (
                    <Image
                      src={project.detailUrl}
                      alt={`${project.title} 상세 이미지`}
                      width={1200}
                      height={1200}
                      unoptimized
                      className="h-auto w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-[320px] items-center justify-center bg-neutral-4 text-[13px] text-neutral-7">
                      상세 이미지가 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>

        <div className="sticky bottom-0 z-20 mt-auto">
          <BottomTabBar variant="archive" />
        </div>
      </div>
    </div>
  );
}
