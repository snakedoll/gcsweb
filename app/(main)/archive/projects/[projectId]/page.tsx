'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { BottomTabBar, NavBar } from '@/components/layout';
import { ArchiveCard2, ProfileAvatar, ToastMessage } from '@/components/ui';
import { useUser } from '@/hooks/useUser';
import { PROFILE_AVATAR_ATTR, PROFILE_BOUNDS_ATTR } from '@/components/ui/archive/project/ProfileAvatar';

const MAJOR_MEMBER_TYPE = 1;
const TOAST_DURATION_MS = 3000;

/** GET /api/v2/archive/projects/{projectId} 의 members[] */
type ProjectMember = {
  memberId: string;
  isRepresentative: boolean;
  name: string;
  memberType: number;
  major: string | null;
  displayLabel: string;
  profileImageUrl: string | null;
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
  thumbnailUrl: string | null;
  detailUrl: string | null;
  projectUrl: string;
  isScrap: boolean;
  members: ProjectMember[];
};

type ArchiveProjectDetailResponse = {
  status: 'success' | 'error';
  data?: { project: ArchiveProjectDetail };
  message?: string;
};

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

  const { isAuthenticated } = useUser();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [project, setProject] = useState<ArchiveProjectDetail | null>(null);
  const [togglingScrap, setTogglingScrap] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setErrorMessage(null);
      setSelectedMemberId(null);

      try {
        const res = await fetch(`/api/v2/archive/projects/${projectId}`, { cache: 'no-store' });
        const json = (await res.json().catch(() => ({}))) as ArchiveProjectDetailResponse;

        if (!res.ok || json.status !== 'success' || !json.data?.project) {
          throw new Error(json.message ?? '프로젝트 상세를 불러오지 못했습니다.');
        }
        if (!cancelled) setProject(json.data.project);
      } catch (error: any) {
        console.error(error);
        if (!cancelled) {
          setProject(null);
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

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  // 선택된 팀원이 있을 때 아바타 바깥을 누르면 이름표를 닫는다. 아바타끼리의 전환·해제는 onClick이 처리한다.
  useEffect(() => {
    if (!selectedMemberId) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (target?.closest(`[${PROFILE_AVATAR_ATTR}]`)) return;
      setSelectedMemberId(null);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [selectedMemberId]);

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMessage(message);
    toastTimer.current = setTimeout(() => setToastMessage(null), TOAST_DURATION_MS);
  };

  const handleShare = async () => {
    if (!project) return;
    const url = project.projectUrl || window.location.href;

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: project.title, text: `${project.teamName} - ${project.title}`, url });
        return;
      } catch (error: any) {
        // 사용자가 공유 창을 닫은 경우는 조용히 끝낸다.
        if (error?.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      showToast('링크가 복사되었습니다.');
    } catch (error) {
      console.error('Share link copy failed:', error);
      showToast('링크를 복사하지 못했습니다.');
    }
  };

  const handleToggleScrap = async () => {
    if (!project || togglingScrap) return;
    if (!isAuthenticated) {
      alert('로그인이 필요한 서비스입니다.');
      router.push('/login');
      return;
    }
    setTogglingScrap(true);
    try {
      const res = await fetch(`/api/v1/archive/projects/${project.projectId}/scrap`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.status === 'success') {
        setProject((prev) => (prev ? { ...prev, isScrap: json.data?.isScraped ?? !prev.isScrap } : prev));
      }
    } catch (err) {
      console.error('Scrap toggle failed:', err);
    } finally {
      setTogglingScrap(false);
    }
  };

  const members = project?.members ?? [];

  return (
    <div className="min-h-screen bg-neutral-3">
      <div
        className="mx-auto flex min-h-screen w-full max-w-[375px] flex-col bg-neutral-3"
        {...{ [PROFILE_BOUNDS_ATTR]: '' }}
      >
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
                <ArchiveCard2
                  title={project.title}
                  subtitle={project.teamName}
                  year={project.year}
                  category={project.category}
                  imageSrc={project.thumbnailUrl ?? undefined}
                  selected={project.isScrap}
                  onShareClick={handleShare}
                  onBookmarkClick={handleToggleScrap}
                />

                <div className="flex flex-col items-center gap-[13px] px-4">
                  <p className="text-[15px] leading-[1.5] text-neutral-8">
                    {`${project.teamName}에 함께한 팀원들을 알아보세요!`}
                  </p>
                  {members.length > 0 ? (
                    // 이름표(아바타 아래 26px)가 다음 줄·아래 이미지와 겹치지 않도록 줄 간격과 아래 여백을 둔다.
                    <div className="flex flex-wrap justify-center gap-x-2 gap-y-9 pb-8">
                      {members.map((member) => {
                        const selected = member.memberId === selectedMemberId;
                        return (
                          <ProfileAvatar
                            key={member.memberId}
                            variant={
                              selected ? (member.memberType === MAJOR_MEMBER_TYPE ? 'major' : 'general') : 'default'
                            }
                            name={member.name}
                            major={member.major ?? undefined}
                            label={member.displayLabel}
                            imageSrc={member.profileImageUrl}
                            onClick={() => setSelectedMemberId(selected ? null : member.memberId)}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[13px] leading-[1.5] text-neutral-7">등록된 팀원 정보가 없습니다.</p>
                  )}
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

        {toastMessage ? (
          <div className="pointer-events-none fixed inset-x-0 bottom-[88px] z-30 mx-auto w-full max-w-[375px] px-4" role="status">
            <ToastMessage message={toastMessage} />
          </div>
        ) : null}

        <div className="sticky bottom-0 z-20 mt-auto">
          <BottomTabBar variant="archive" />
        </div>
      </div>
    </div>
  );
}
