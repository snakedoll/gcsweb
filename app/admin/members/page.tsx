'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NavBar } from '@/components/layout';
import SearchBar from '@/components/ui/SearchBar';
import { formatPhoneWithHyphen } from '@/lib/format-phone';
import { cn } from '@/lib/utils';

type MemberRole = 'general' | 'major' | 'admin';

interface Member {
  id: string;
  name: string;
  phone: string;
  role: MemberRole;
}

function getRoleLabel(role: MemberRole): string {
  if (role === 'admin') return '관리자';
  if (role === 'major') return '전공';
  return '일반';
}

export default function AdminMembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    fetch(`/api/v1/admin/members?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((data) => setMembers(data.members ?? []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  return (
    <div className="flex min-h-screen w-full max-w-[375px] flex-col">
      <NavBar
        variant="title-back"
        title="회원 관리"
        onBack={() => router.push('/admin')}
      />

      <div className="flex-1 bg-neutral-3 px-4 py-4">
        <div className="space-y-4">
          <SearchBar
            placeholder="이름으로 검색..."
            value={searchInput}
            onChange={setSearchInput}
          />

          <div className="flex items-center justify-between">
            <p className="typo-body-xsmall text-neutral-10">전체 {members.length}명</p>
            <button
              type="button"
              className="rounded-lg bg-neutral-8 px-4 py-2 typo-body-xsmall-bold text-neutral-1"
            >
              명단 내보내기
            </button>
          </div>

          <div className="rounded-lg border border-neutral-5 bg-neutral-1">
            {loading ? (
              <div className="py-8 text-center typo-body-xsmall text-neutral-7">
                로딩 중...
              </div>
            ) : members.length === 0 ? (
              <div className="py-8 text-center typo-body-xsmall text-neutral-7">
                회원이 없습니다.
              </div>
            ) : (
              <ul className="divide-y divide-neutral-4">
                {members.map((member) => (
                  <li key={member.id}>
                    <Link
                      href={`/admin/members/${member.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="typo-body-small-bold text-neutral-10">
                          {member.name}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              'rounded px-2 py-0.5 typo-body-xsmall text-neutral-2',
                              member.role === 'admin' ? 'bg-orange-5' : 'bg-neutral-6'
                            )}
                          >
                            {getRoleLabel(member.role)}
                          </span>
                          {member.phone && (
                            <span className="typo-body-xsmall text-neutral-10">
                              {formatPhoneWithHyphen(member.phone)}
                            </span>
                          )}
                        </div>
                      </div>
                      <Image
                        src="/assets/icons/icon-right.svg"
                        alt=""
                        width={24}
                        height={24}
                        className="shrink-0"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
