'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NavBar } from '@/components/layout';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { formatPhoneWithHyphen } from '@/lib/format-phone';

interface TeamMember {
  role: string;
  name: string;
  phone: string;
}

interface TeamData {
  id: string;
  name: string;
  type: string;
  members: TeamMember[];
  accountUrl?: string;
}

function TeamInfoCard({ team, isAdmin }: { team: TeamData; isAdmin: boolean }) {
  const router = useRouter();
  
  return (
    <div className="flex w-full flex-col rounded-[8px] bg-neutral-1 shadow-[0px_1px_2px_0px_rgba(99,81,73,0.1)] overflow-hidden">
      <div className="flex items-start justify-between p-4">
        <div className="flex flex-col gap-1">
          <p className="typo-heading-xxsmall text-neutral-12">{team.name}</p>
          <p className="typo-body-xsmall text-neutral-7">{team.type}</p>
        </div>
        {isAdmin && (
          <button 
            type="button" 
            className="h-6 w-6"
            onClick={() => router.push(`/admin/team/${team.id}/edit`)}
          >
            <Image src="/assets/icons/filled/Filled/Edit 2.svg" alt="수정" width={24} height={24} />
          </button>
        )}
      </div>
      
      <div className="h-px w-full bg-neutral-3" />
      
      <div className="flex flex-col gap-3 p-4">
        {team.members.map((member, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={member.role === '대표' ? "w-[40px] px-2 py-1 rounded bg-[#f6874c4d] text-orange-5 typo-body-xsmall-bold text-center" : "w-[40px] px-2 py-1 rounded bg-neutral-4 text-neutral-7 typo-body-xsmall-bold text-center"}>
                {member.role}
              </span>
              <span className="typo-body-small text-neutral-10">{member.name}</span>
            </div>
            <span className="typo-body-small text-neutral-8">{formatPhoneWithHyphen(member.phone)}</span>
          </div>
        ))}
      </div>

      {team.accountUrl && (
        <>
          <div className="h-px w-full bg-neutral-3" />
          <div className="p-4">
            <button type="button" className="typo-body-xsmall text-neutral-10 underline underline-offset-2">
              통장 사본 다운로드
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function TeamInfoPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<TeamData[]>([]);

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/v1/mypage/teams', { cache: 'no-store' });
        const json = await res.json();
        if (json.status === 'success') {
          setTeams(json.data.teams);
        }
      } catch (e) {
        console.error('Failed to fetch teams', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="flex min-h-screen w-full flex-col bg-neutral-3 text-neutral-12">
      <NavBar variant="title-back" title="팀 정보" />
      
      <main className="mx-auto flex w-full max-w-[375px] flex-1 flex-col gap-6 px-4 pt-6 pb-8">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="typo-body-small text-neutral-7">불러오는 중...</p>
          </div>
        ) : teams.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 pb-20">
            <div className="flex flex-col items-center gap-1 text-center">
              <h2 className="typo-heading-small text-neutral-12">소속된 판매팀이 없습니다.</h2>
              <p className="typo-body-small text-neutral-8">GCS:Web에 상품을 등록하고 싶다면?</p>
            </div>
            <button 
              type="button"
              className="flex h-[47px] w-[182px] items-center justify-center rounded-[8px] bg-neutral-10 typo-body-small-bold text-neutral-2 transition-opacity active:opacity-90"
              onClick={() => router.push('/mypage/inquires')}
            >
              창작자 가이드 보러가기
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {teams.map(team => (
              <TeamInfoCard key={team.id} team={team} isAdmin={isAdmin} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
