'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Footer, NavBar } from '@/components/layout';

type ProjectDetail = {
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
};

type ProjectDetailResponse = {
  status: 'success';
  data: {
    project: ProjectDetail;
  };
};

type ErrorResponse = {
  status: 'error';
  code?: string;
  message?: string;
};

function IconButton({ kind, active = false }: { kind: 'share' | 'scrap'; active?: boolean }) {
  const stroke = active ? '#F6874C' : '#999694';
  const fill = active ? '#F6874C' : 'none';

  return (
    <button
      type="button"
      disabled
      className="inline-flex h-6 w-6 items-center justify-center opacity-80"
      aria-label={kind === 'share' ? '공유(준비중)' : '스크랩(준비중)'}
      title="디자인만 적용됨 (기능 준비중)"
    >
      {kind === 'share' ? (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M10 13.5L14 10.5" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="7.5" cy="15" r="2" stroke={stroke} strokeWidth="1.5" />
          <circle cx="16.5" cy="9" r="2" stroke={stroke} strokeWidth="1.5" />
          <circle cx="16.5" cy="18" r="2" stroke={stroke} strokeWidth="1.5" />
          <path d="M10 16.5L14 18" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={fill} aria-hidden>
          <path
            d="M7 4.5H17C17.8 4.5 18.5 5.2 18.5 6V20L12 16.2L5.5 20V6C5.5 5.2 6.2 4.5 7 4.5Z"
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

export default function ArchiveProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = typeof params?.projectId === 'string' ? params.projectId : '';
  const { data: session, status } = useSession();
  const isAdmin = status === 'authenticated' && session?.user?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectDetail | null>(null);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      setError('올바르지 않은 프로젝트 ID입니다.');
      return;
    }

    let ignore = false;
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/v1/archive/projects/${projectId}`, { cache: 'no-store' });
        const json = (await res.json()) as ProjectDetailResponse | ErrorResponse;
        if (!res.ok || json.status !== 'success') {
          throw new Error((json as ErrorResponse).message ?? '프로젝트를 불러오지 못했습니다.');
        }
        if (!ignore) setProject(json.data.project);
      } catch (e) {
        if (!ignore) {
          setProject(null);
          setError(e instanceof Error ? e.message : '서버 오류가 발생했습니다.');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    void fetchDetail();
    return () => {
      ignore = true;
    };
  }, [projectId]);

  const tagText = useMemo(() => {
    if (!project) return '';
    return `${project.year} | ${project.category}`;
  }, [project]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-neutral-3">
      <NavBar variant="logo-back" />

      <main className="mx-auto w-full max-w-[375px] flex-1 bg-neutral-3 px-4 pb-8 pt-3">
        {loading ? (
          <div className="py-12 text-center typo-body-small text-neutral-7">프로젝트를 불러오는 중입니다.</div>
        ) : error ? (
          <div className="py-12 text-center typo-body-small text-red-500">{error}</div>
        ) : !project ? (
          <div className="py-12 text-center typo-body-small text-neutral-7">프로젝트를 찾을 수 없습니다.</div>
        ) : (
          <>
            <section className="rounded-xl border border-neutral-4 bg-neutral-2 px-3 py-3">
              <div className="overflow-hidden rounded-lg border border-neutral-5 bg-neutral-1">
                <img src={project.thumbnailUrl} alt={`${project.title} 표지`} className="h-auto w-full object-cover" />
              </div>

              <div className="mt-3">
                <p className="typo-body-medium-bold text-neutral-11">{project.title}</p>
                <p className="mt-1 typo-body-small text-neutral-7">{project.teamName}</p>
              </div>

              <div className="mt-3 flex items-center justify-between rounded-lg bg-neutral-4 px-3 py-2">
                <span className="text-[11px] leading-[1.5] text-neutral-8">{tagText}</span>
                <div className="flex items-center gap-2">
                  <IconButton kind="share" />
                  <IconButton kind="scrap" active={project.isScrap} />
                </div>
              </div>
            </section>

            <section className="mt-8 text-center">
              <p className="text-[11px] leading-[1.5] text-neutral-8">유랑이 함께한 팀원들을 알아보세요!</p>
              <div className="mt-3 flex items-center justify-center -space-x-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-neutral-2 bg-neutral-5 text-[10px] text-neutral-8"
                  >
                    팀원
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-8 overflow-hidden">
              <img src={project.detailUrl} alt={`${project.title} 상세 이미지`} className="w-full object-cover" />
            </section>
          </>
        )}
      </main>

      <Footer showAdminButton={isAdmin} />
    </div>
  );
}

