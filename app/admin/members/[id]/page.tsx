'use client';

import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NavBar } from '@/components/layout';
import DeleteAccountModal from '@/components/admin/DeleteAccountModal';
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
  const id = params?.id as string;

  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/members/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(setMember)
      .catch(() => setMember(null))
      .finally(() => setLoading(false));
  }, [id]);

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

      <div className="flex-1 bg-neutral-3 px-4 py-4">
        <div className="space-y-4">
          {/* Profile Overview Card */}
          <div className="rounded-lg border border-neutral-5 bg-neutral-1 p-4">
            <div className="flex items-start gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-neutral-4">
                {member.profileImage ? (
                  <Image
                    src={member.profileImage}
                    alt=""
                    fill
                    className="object-cover"
                  />
                ) : (
                  <Image
                    src="/assets/images/default-avatar.svg"
                    alt=""
                    fill
                    className="object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="typo-body-small-bold text-neutral-10">
                    {member.name}
                  </span>
                  {member.isSeller && (
                    <span className="rounded bg-orange-5 px-2 py-0.5 typo-body-xsmall text-neutral-2">
                      판매자
                    </span>
                  )}
                </div>
                <p className="mt-1 typo-body-xsmall text-neutral-8">{member.email}</p>
              </div>
            </div>
          </div>

          {/* Member Type Card */}
          <div className="rounded-lg border border-neutral-5 bg-neutral-1 p-4">
            <h3 className="typo-body-small-bold text-neutral-10 mb-3">회원유형</h3>
            <div className="flex items-center justify-between rounded-lg border border-neutral-5 bg-neutral-2 px-3 py-2">
              <span className="typo-body-xsmall text-neutral-10">
                {MEMBER_TYPE_LABELS[member.memberType] ?? '일반 회원'}
              </span>
              <Image src="/assets/icons/icon-right.svg" alt="" width={20} height={20} className="rotate-90" />
            </div>
            <p className="mt-2 typo-body-xsmall text-neutral-7">
              회원유형에 따라 접근 권한이 달라집니다.
            </p>
          </div>

          {/* Member Information Card */}
          <div className="rounded-lg border border-neutral-5 bg-neutral-1 p-4">
            <h3 className="typo-body-small-bold text-neutral-10 mb-3">회원 정보</h3>
            <dl className="space-y-3">
              <div className="flex justify-between gap-4">
                <dt className="typo-body-xsmall text-neutral-7 shrink-0">이름</dt>
                <dd className="typo-body-xsmall text-neutral-10 text-right">{member.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="typo-body-xsmall text-neutral-7 shrink-0">계정</dt>
                <dd className="typo-body-xsmall text-neutral-10 text-right break-all">{member.email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="typo-body-xsmall text-neutral-7 shrink-0">연락처</dt>
                <dd className="typo-body-xsmall text-neutral-10 text-right">
                  {member.phone ? formatPhoneWithHyphen(member.phone) : '-'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="typo-body-xsmall text-neutral-7 shrink-0">가입일</dt>
                <dd className="typo-body-xsmall text-neutral-10 text-right">
                  {formatJoinDate(member.createdAt)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Account Deletion Card */}
          <div className="rounded-lg border border-neutral-5 bg-neutral-1 p-4">
            <h3 className="typo-body-small-bold text-neutral-10 mb-2">계정 삭제</h3>
            <p className="typo-body-xsmall text-neutral-7">
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
          const res = await fetch(`/api/admin/members/${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Failed to delete');
          router.push('/admin/members');
        }}
      />
    </div>
  );
}
