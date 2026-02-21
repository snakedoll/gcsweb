"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { NavBar } from "@/components/layout";
import SearchBar from "@/components/ui/SearchBar";
import { formatPhoneWithHyphen } from "@/lib/format-phone";
import { cn } from "@/lib/utils";

type MemberRole = "general" | "major" | "admin";

interface Member {
  id: string;
  name: string;
  phone: string;
  role: MemberRole;
}

function getRoleLabel(role: MemberRole): string {
  if (role === "admin") return "관리자";
  if (role === "major") return "전공";
  return "일반";
}

const SAMPLE_MEMBERS: Member[] = [
  { id: "1", name: "김무성", phone: "01011111111", role: "admin" },
  { id: "2", name: "김도환", phone: "01022222222", role: "major" },
  { id: "3", name: "배민영", phone: "01033333333", role: "general" },
  { id: "4", name: "이웅희", phone: "01044444444", role: "general" },
];

export default function AdminMembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>(
    process.env.NODE_ENV === "development" ? SAMPLE_MEMBERS : []
  );
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    fetch(`/api/v1/admin/members?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        const fetched: Member[] = data.members ?? [];
        if (search && search.length > 0) {
          const combined =
            process.env.NODE_ENV === "development"
              ? [...fetched, ...SAMPLE_MEMBERS]
              : fetched;
          setMembers(combined.filter((m) => m.name.includes(search)));
        } else {
          if (fetched.length === 0 && process.env.NODE_ENV === "development") {
            setMembers(SAMPLE_MEMBERS);
          } else {
            setMembers(fetched);
          }
        }
      })
      .catch(() => {
        if (process.env.NODE_ENV === "development") {
          if (search && search.length > 0)
            setMembers(SAMPLE_MEMBERS.filter((m) => m.name.includes(search)));
          else setMembers(SAMPLE_MEMBERS);
        } else {
          setMembers([]);
        }
      })
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <NavBar variant="title-back" title="회원 관리" onBack={() => router.push("/admin")} />

      <div className="flex-1 bg-neutral-3 px-4 py-4">
        <div className="w-full max-w-[375px] mx-auto space-y-4">
          <SearchBar
            placeholder="이름으로 검색..."
            value={searchInput}
            onChange={setSearchInput}
            className="h-[46px] rounded-xl bg-neutral-2"
          />

          <div className="flex items-center justify-between">
            <p className="typo-body-xsmall text-neutral-10">전체 {members.length}명</p>
            <button
              type="button"
              className="rounded-lg bg-neutral-9 px-4 py-[10px] typo-body-small-bold text-neutral-2"
            >
              명단 내보내기
            </button>
          </div>

          <div className="rounded-xl border border-neutral-5 bg-neutral-2">
            {loading ? (
              <div className="py-8 text-center typo-body-xsmall text-neutral-7">로딩 중...</div>
            ) : members.length === 0 ? (
              <div className="py-8 text-center typo-body-xsmall text-neutral-7">회원이 없습니다.</div>
            ) : (
              <ul className="divide-y divide-neutral-4">
                {members.map((member) => (
                  <li key={member.id}>
                    <Link
                      href={`/admin/members/${member.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-[14px]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="typo-body-small-bold text-neutral-10">{member.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "rounded px-2 py-0.5 typo-body-xsmall",
                              member.role === "admin"
                                ? "bg-orange-5 text-neutral-2"
                                : "bg-neutral-6 text-neutral-9"
                            )}
                          >
                            {getRoleLabel(member.role)}
                          </span>
                          {member.phone && (
                            <span className="typo-body-small text-neutral-9">
                              {formatPhoneWithHyphen(member.phone)}
                            </span>
                          )}
                        </div>
                      </div>
                      <Image src="/assets/icons/icon-right.svg" alt="" width={24} height={24} className="shrink-0" />
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
