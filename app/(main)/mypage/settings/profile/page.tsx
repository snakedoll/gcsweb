'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NavBar } from '@/components/layout';
import { Modal } from '@/components/ui/common';

interface ProfileData {
  name: string;
  phone: string;
  email: string;
}

function formatPhoneNumber(phone: string) {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

export default function MemberInfoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    // 임시: 실제 구현시에는 useUser 훅이나 API fetch 사용
    (async () => {
      try {
        const res = await fetch('/api/v1/mypage/info', { cache: 'no-store' });
        const json = await res.json();
        if (json.status === 'success') {
          setProfile({
            name: json.data.user.name ?? '',
            phone: json.data.user.phone ?? '',
            email: json.data.user.email ?? '',
          });
        }
      } catch (e) {
        console.error('Failed to fetch profile', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    setTimeout(() => {
      setSaving(false);
      setShowSuccessModal(true);
    }, 500);
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-neutral-3">
      <NavBar variant="title-back" title="회원 정보" />
      
      <main className="mx-auto flex w-full max-w-[375px] flex-1 flex-col gap-6 px-4 pt-6 pb-8">
        <div className="flex flex-col gap-2">
          <label className="typo-body-small-bold text-neutral-12">이름</label>
          <div className="flex h-[47px] w-full items-center rounded-[8px] border border-neutral-6 bg-neutral-3 px-4">
            <span className="typo-body-xsmall text-neutral-7">{profile?.name || (loading ? '...' : '-')}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="typo-body-small-bold text-neutral-12">전화번호</label>
          <div className="flex h-[47px] w-full items-center rounded-[8px] border border-neutral-6 bg-neutral-1 px-4">
            <span className="typo-body-xsmall text-neutral-10">
              {profile ? formatPhoneNumber(profile.phone) : loading ? '...' : '-'}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="typo-body-small-bold text-neutral-12">이메일</label>
          <div className="flex h-[47px] w-full items-center rounded-[8px] border border-neutral-6 bg-neutral-1 px-4">
            <span className="typo-body-xsmall text-neutral-10">{profile?.email || (loading ? '...' : '-')}</span>
          </div>
        </div>

        <div className="mt-auto pt-10">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || saving}
            className="flex h-[55px] w-full items-center justify-center rounded-[8px] bg-orange-5 typo-body-small-bold text-neutral-1 transition-colors active:bg-orange-6 disabled:bg-orange-3"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </main>

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <Modal
            variant="one button"
            title="회원 정보가 수정되었습니다."
            confirmText="확인"
            onConfirm={() => setShowSuccessModal(false)}
          />
        </div>
      )}
    </div>
  );
}
