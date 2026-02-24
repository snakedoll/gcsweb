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
import { cn } from '@/lib/utils';

interface MemberDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  profileImage?: string;
  memberType: number;
  isSeller: boolean;
  createdAt: string;
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

  // close dropdown when clicking outside
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
      // optimistic UI
      setMember({ ...member, memberType: newType });
      const res = await fetch(`/api/v1/admin/members/${member.id}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: member.id, memberType: newType }),
      });
      if (!res.ok) {
        throw new Error('Failed to update');
      }
      const json = await res.json().catch(() => null);
      const updatedUser = json?.data?.user;
      if (updatedUser && typeof updatedUser.memberType === 'number') {
        setMember((m) => (m ? { ...m, memberType: updatedUser.memberType } : m));
      }

      if (isSelfRoleChange) {
        await signOut({ callbackUrl: '/login' });
      }
    } catch (err) {
      // revert on error
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
      <div className="flex min-h-screen w-full max-w-[375px] flex-col">
        <NavBar variant="title-back" title="회원 세부정보" />
        <div className="flex flex-1 items-center justify-center">
          <p className="typo-body-xsmall text-neutral-7">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex min-h-screen w-full max-w-[375px] flex-col">
        <NavBar variant="title-back" title="회원 세부정보" />
        <div className="flex flex-1 items-center justify-center">
          <p className="typo-body-xsmall text-neutral-7">회원을 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[375px] flex-col">
      <NavBar variant="title-back" title="회원 세부정보" />

      {toastMessage && (
        <div className="px-4 pt-4">
          <ToastMessage message={toastMessage} />
        </div>
      )}

      <div className="flex-1 bg-neutral-3 px-4 py-4">
        <div className="space-y-4">
          {/* Profile Overview Card */}
          <MemberProfileCard
            name={member.name}
            email={member.email}
            isSeller={member.isSeller}
            profileImage={member.profileImage}
          />

          {/* Member Type Card */}
          <div className="rounded-lg border border-neutral-5 bg-neutral-1 p-4">
            <h3 className="typo-body-small-bold text-neutral-10 mb-3">회원유형</h3>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setTypeDropdownOpen((v) => !v)}
                className="flex w-full items-center justify-between rounded-lg border border-neutral-5 bg-neutral-2 px-3 py-2"
                aria-haspopup="listbox"
                aria-expanded={typeDropdownOpen}
              >
                <span className="typo-body-xsmall text-neutral-10 text-left">
                  {MEMBER_TYPE_LABELS[member.memberType] ?? '일반 회원'}
                </span>
                <Image src="/assets/icons/icon-right.svg" alt="" width={20} height={20} className={typeDropdownOpen ? 'rotate-180' : 'rotate-90'} />
              </button>

              {typeDropdownOpen && (
                <ul
                  role="listbox"
                  className="absolute left-0 right-0 mt-2 z-20 rounded-lg border border-neutral-5 bg-neutral-1 py-1 shadow-sm"
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
                        className={`px-3 py-2 cursor-pointer hover:bg-neutral-3 ${member.memberType === num ? 'font-semibold' : ''}`}
                      >
                        <span className="typo-body-xsmall text-neutral-10">{label}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <p className="mt-2 typo-body-xsmall text-neutral-7">
              회원유형에 따라 접근 권한이 달라집니다.
            </p>
          </div>

          {/* Member Information Card */}
          <div className="rounded-lg border border-neutral-5 bg-neutral-1 p-4">
            <h3 className="typo-body-small-bold text-neutral-10 mb-3">회원 정보</h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-4">
                <span className="typo-body-xsmall w-16 flex-shrink-0" style={{ color: '#85817E' }}>이름</span>
                <span className="typo-body-xsmall" style={{ color: '#85817E' }}>{member.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="typo-body-xsmall w-16 flex-shrink-0" style={{ color: '#85817E' }}>계정</span>
                <span className="typo-body-xsmall" style={{ color: '#85817E' }}>{member.email}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="typo-body-xsmall w-16 flex-shrink-0" style={{ color: '#85817E' }}>연락처</span>
                <span className="typo-body-xsmall" style={{ color: '#85817E' }}>{member.phone ? formatPhoneWithHyphen(member.phone) : '-'}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="typo-body-xsmall w-16 flex-shrink-0" style={{ color: '#85817E' }}>가입일</span>
                <span className="typo-body-xsmall" style={{ color: '#85817E' }}>{formatJoinDate(member.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Account Deletion Card */}
          <div className="rounded-lg border border-neutral-5 bg-neutral-1 p-4">
            <h3 className="typo-body-small-bold text-neutral-10 mb-2">계정 삭제</h3>
            <p style={{ color: 'var(--Neutral-neutral-7, #999694)', fontFamily: 'Pretendard', fontSize: '11px', fontStyle: 'normal', fontWeight: 400, lineHeight: '150%' }}>
              계정 삭제 시 모든 정보가 즉시 삭제되며, 이후에는 복구할 수 없습니다.
            </p>
          </div>
        </div>

          <div className="mt-4 flex justify-end px-4 pb-4">
          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-3 typo-body-small-bold text-neutral-1',
              'bg-danger'
            )}
          >
            <Image src="/assets/icons/icon-warning-triangle.svg" alt="" width={20} height={20} />
            계정 삭제
          </button>
        </div>
      </div>

      <DeleteAccountModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={async () => {
          const res = await fetch(`/api/v1/admin/members/${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Failed to delete');
          // show toast and redirect shortly after
          setToastMessage('삭제되었습니다.');
          setTimeout(() => router.push('/admin/members'), 1000);
        }}
      />
    </div>
  );
}
