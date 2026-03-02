'use client';

import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { NavBar } from '@/components/layout';
import DeleteAccountModal from '@/components/ui/admin/memberTeamManagement/DeleteAccountModal';
import ToastMessage from '@/components/ui/common/ToastMessage';
import MemberProfileCard from '@/components/ui/admin/memberTeamManagement/MemberProfileCard';
import { formatPhoneWithHyphen } from '@/lib/format-phone';

interface MemberDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  profileImage?: string;
  memberType: number;
  isSeller: boolean;
  createdAt: string;
  nickname?: string;
  studentId?: string;
  major?: string;
}

const MEMBER_TYPE_LABELS: Record<number, string> = {
  0: '일반 회원',
  1: '전공 회원',
  2: '관리자',
};

function formatJoinDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 h-[19.49px]">
      <span className="text-[13px] leading-[1.5] tracking-[-0.26px] w-16 flex-shrink-0" style={{ color: '#85817e' }}>{label}</span>
      <span className="text-[13px] leading-[1.5] tracking-[-0.26px]" style={{ color: '#85817e' }}>{value}</span>
    </div>
  );
}

export default function AdminMemberDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const id = params?.id as string;

  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/v1/admin/members/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(setMember)
      .catch(() => setMember(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!dropdownRef.current) return;
      if (dropdownRef.current.contains(e.target as Node)) return;
      setTypeDropdownOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  async function updateMemberType(newType: number) {
    if (!member) return;
    const prevType = member.memberType;
    const isSelfRoleChange = session?.user?.id === member.id && prevType !== newType;
    try {
      setMember({ ...member, memberType: newType });
      const res = await fetch(`/api/v1/admin/members/${member.id}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: member.id, memberType: newType }),
      });
      if (!res.ok) throw new Error('Failed to update');
      const json = await res.json().catch(() => null);
      const updatedUser = json?.data?.user;
      if (updatedUser && typeof updatedUser.memberType === 'number') {
        setMember((m) => (m ? { ...m, memberType: updatedUser.memberType } : m));
      }
      if (isSelfRoleChange) {
        await signOut({ redirect: false });
        router.replace('/login');
      }
    } catch (err) {
      setMember((m) => (m ? { ...m, memberType: prevType } : m));
      console.error(err);
    }
  }

  if (!id) {
    router.push('/admin/members');
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center bg-[#f6f6f5]">
        <NavBar variant="title-back" title="사용자 세부정보" />
        <div className="flex w-full max-w-[375px] flex-1 items-center justify-center">
          <p className="text-[13px] leading-[1.5] tracking-[-0.26px] text-[#999694]">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center bg-[#f6f6f5]">
        <NavBar variant="title-back" title="사용자 세부정보" />
        <div className="flex w-full max-w-[375px] flex-1 items-center justify-center">
          <p className="text-[13px] leading-[1.5] tracking-[-0.26px] text-[#999694]">회원을 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-[#f6f6f5]">
      <NavBar variant="title-back" title="사용자 세부정보" />

      <div className="flex w-full max-w-[375px] flex-1 flex-col px-4">
        {toastMessage && (
          <div className="pt-4">
            <ToastMessage message={toastMessage} />
          </div>
        )}

        <div className="flex flex-col gap-6 py-6">
          {/* Profile Overview */}
          <MemberProfileCard
            name={member.name}
            email={member.email}
            isSeller={member.isSeller}
            profileImage={member.profileImage}
          />

          {/* Cards */}
          <div className="flex flex-col gap-4">
            {/* 회원유형 Card */}
            <div className="rounded-[8px] border border-[#f1f1f1] bg-[#fdfdfd] p-4">
              <div className="flex flex-col gap-2">
                <h3 className="font-bold text-[15px] leading-[1.5] text-[#3f3835]">회원유형</h3>
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setTypeDropdownOpen((v) => !v)}
                    className="flex w-full items-center justify-between rounded-[4px] border border-[#c7c5c4] bg-[#fdfdfd] px-3 py-2"
                    aria-haspopup="listbox"
                    aria-expanded={typeDropdownOpen}
                  >
                    <span className="text-[13px] leading-[1.5] tracking-[-0.26px] text-[#3f3835]">
                      {MEMBER_TYPE_LABELS[member.memberType] ?? '일반 회원'}
                    </span>
                    <Image src="/assets/icons/icon-right.svg" alt="" width={20} height={20} className={typeDropdownOpen ? 'rotate-180' : 'rotate-90'} />
                  </button>

                  {typeDropdownOpen && (
                    <ul
                      role="listbox"
                      className="absolute left-0 right-0 mt-1 z-20 rounded-[4px] border border-[#dddcdb] bg-[#fdfdfd] py-1 shadow-sm"
                    >
                      {Object.entries(MEMBER_TYPE_LABELS).map(([key, label]) => {
                        const num = Number(key);
                        return (
                          <li
                            key={key}
                            role="option"
                            aria-selected={member.memberType === num}
                            onClick={() => {
                              setTypeDropdownOpen(false);
                              updateMemberType(num);
                            }}
                            className={`px-3 py-2 cursor-pointer hover:bg-[#f6f6f5] text-[13px] leading-[1.5] tracking-[-0.26px] text-[#3f3835] ${member.memberType === num ? 'font-semibold' : ''}`}
                          >
                            {label}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <p className="text-[11px] leading-[1.5] text-[#999694]">
                  회원유형에 따라 접근 권한이 달라집니다.
                </p>
              </div>
            </div>

            {/* 회원 정보 Card */}
            <div className="rounded-[8px] border border-[#f1f1f1] bg-[#fdfdfd] p-4">
              <div className="flex flex-col gap-2">
                <h3 className="font-bold text-[15px] leading-[1.5] text-[#3f3835]">회원 정보</h3>
                <div className="h-px bg-[#f1f1f1]" />
                <div className="flex flex-col gap-2 rounded-[12px]">
                  <InfoRow label="이름" value={member.name} />
                  <InfoRow label="계정" value={member.email} />
                  <InfoRow label="연락처" value={member.phone ? formatPhoneWithHyphen(member.phone) : '-'} />
                  <InfoRow label="가입일" value={formatJoinDate(member.createdAt)} />
                </div>
              </div>
            </div>

            {/* 학사 정보 Card (전공 회원) */}
            {member.memberType === 1 && (
              <div className="rounded-[8px] border border-[#f1f1f1] bg-[#fdfdfd] p-4">
                <div className="flex flex-col gap-2">
                  <h3 className="font-bold text-[15px] leading-[1.5] text-[#3f3835]">학사 정보</h3>
                  <div className="h-px bg-[#f1f1f1]" />
                  <div className="flex flex-col gap-2 rounded-[12px]">
                    <InfoRow label="닉네임" value={member.nickname || '-'} />
                    <InfoRow label="학번" value={member.studentId || '-'} />
                    <InfoRow label="주전공" value={member.major || '-'} />
                  </div>
                </div>
              </div>
            )}

            {/* 계정 삭제 Card */}
            <div className="flex flex-col gap-2">
              <div className="rounded-[8px] border border-[#f1f1f1] bg-[#fdfdfd] p-4 flex flex-col gap-2">
                <h3 className="font-bold text-[15px] leading-[1.5] text-[#3f3835]">계정 삭제</h3>
                <p className="text-[11px] leading-[1.5] text-[#999694]">
                  계정 삭제 시 모든 정보가 즉시 삭제되며, 이후에는 복구할 수 없습니다.
                </p>
              </div>
              <div className="flex justify-end px-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(true)}
                  className="flex items-center gap-2 rounded-[8px] bg-[#ce1e1b] pl-3 pr-4 py-2"
                >
                  <Image src="/assets/icons/icon-warning-triangle.svg" alt="" width={20} height={20} />
                  <span className="font-bold text-[15px] leading-[1.5] text-[#fdfdfd]">계정 삭제</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DeleteAccountModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={async () => {
          const res = await fetch(`/api/v1/admin/members/${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Failed to delete');
          setToastMessage('삭제되었습니다.');
          setTimeout(() => router.push('/admin/members'), 1000);
        }}
      />
    </div>
  );
}
