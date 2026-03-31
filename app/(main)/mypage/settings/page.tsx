'use client';

import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { NavBar } from '@/components/layout';
import { useUser } from '@/hooks/useUser';

function SettingMenuCard({
  title,
  description,
  onClick,
}: {
  title: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col items-start gap-[5px] rounded-[8px] bg-neutral-1 p-4 text-left shadow-[0px_1px_2px_0px_rgba(99,81,73,0.1)] transition-colors active:bg-neutral-2"
    >
      <p className="typo-heading-xxsmall text-neutral-12">{title}</p>
      {description && (
        <>
          <div className="h-px w-full bg-neutral-4" />
          <p className="typo-body-xsmall text-neutral-8">{description}</p>
        </>
      )}
    </button>
  );
}

export default function MypageSettingsPage() {
  const router = useRouter();
  const { profile } = useUser();

  const handleLogout = async () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      await signOut({ callbackUrl: '/' });
    }
  };

  const handleDeleteAccount = () => {
    alert('계정 삭제 기능은 현재 준비 중입니다.');
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-neutral-3">
      <NavBar variant="title-back" title="설정" />

      <main className="mx-auto flex w-full max-w-[375px] flex-1 flex-col px-4 pb-[32px] pt-5">
        <div className="flex flex-col gap-[23px]">
          <SettingMenuCard
            title="회원 정보"
            description="이름, 전화번호, 이메일"
            onClick={() => router.push('/mypage/settings/profile')}
          />
          <SettingMenuCard
            title="팀 정보"
            description="팀명, 팀장, 팀원, 정산 계좌"
            onClick={() => router.push('/mypage/settings/teams')}
          />
          {profile?.hasPassword !== false && (
            <SettingMenuCard
              title="비밀번호 변경"
              onClick={() => router.push('/mypage/settings/password')}
            />
          )}
        </div>

        <div className="mt-auto flex flex-col items-center gap-3 pt-6">
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-[55px] w-full items-center justify-center rounded-[8px] bg-[#e9ded2] typo-body-small-bold text-neutral-12 transition-opacity active:opacity-80"
          >
            로그아웃
          </button>
          <button
            type="button"
            onClick={handleDeleteAccount}
            className="typo-body-xsmall text-neutral-8"
          >
            계정 삭제
          </button>
        </div>
      </main>
    </div>
  );
}
