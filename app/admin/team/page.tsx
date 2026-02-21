"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NavBar } from "@/components/layout";
import SearchBar from "@/components/ui/SearchBar";
import Image from "next/image";

interface Team {
  id: string;
  teamName: string;
  teamType: 0 | 1; // 0: general, 1: seller
  accountUrl: string | null;
  members: Array<{
    role: string;
    name: string;
    phone: string | null;
  }>;
}

const SAMPLE_TEAMS: Team[] = [
  {
    id: "t1",
    teamName: "제작팀 A",
    teamType: 0,
    accountUrl: null,
    members: [
      { role: "대표", name: "김무성", phone: "010-1234-5678" },
      { role: "팀원", name: "배민영", phone: "010-2222-3333" },
      { role: "팀원", name: "이웅희", phone: "010-4444-5555" },
    ],
  },
  {
    id: "t2",
    teamName: "제작팀 B",
    teamType: 1,
    accountUrl: "https://example.com",
    members: [
      { role: "대표", name: "박디자인", phone: "010-9876-5432" },
      { role: "팀원", name: "최박사", phone: "010-5555-6666" },
      { role: "팀원", name: "정아트", phone: "010-7777-8888" },
    ],
  },
];

export default function AdminTeamListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [teams, setTeams] = useState<Team[]>(
    process.env.NODE_ENV === "development" ? SAMPLE_TEAMS : []
  );
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sellerOnly, setSellerOnly] = useState(false);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const toastParam = searchParams.get("toast");
    if (toastParam === "updated") {
      setToastMessage("수정되었습니다.");
      // url 정리
      router.replace("/admin/team");
    } else if (toastParam === "created") {
      setToastMessage("팀이 생성되었습니다.");
      // url 정리
      router.replace("/admin/team");
    }
  }, [searchParams, router]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("name", search);
      const res = await fetch(`/api/v1/admin/teams?${params}`);
      const json = await res.json();
      if (json?.status === "success") {
        let teamList = json.data?.teams || [];
        // If running in development and no teams exist in DB, use SAMPLE_TEAMS for easier visual testing
        if (process.env.NODE_ENV === "development" && (json.data?.totalCount ?? teamList.length) === 0) {
          teamList = SAMPLE_TEAMS;
        }
        if (sellerOnly) {
          teamList = teamList.filter((t: Team) => t.teamType === 1);
        }
        // If searching, apply client-side filter as well for SAMPLE_TEAMS fallback
        if (search) {
          teamList = teamList.filter((t: Team) => t.teamName.includes(search));
        }
        setTeams(teamList);
      } else setTeams([]);
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        let teamList = SAMPLE_TEAMS;
        if (sellerOnly) {
          teamList = teamList.filter((t) => t.teamType === 1);
        }
        if (search) {
          teamList = teamList.filter((t) => t.teamName.includes(search));
        }
        setTeams(teamList);
      } else setTeams([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sellerOnly]);

  const toggleTeam = (teamId: string) => {
    const newExpanded = new Set(expandedTeams);
    if (newExpanded.has(teamId)) {
      newExpanded.delete(teamId);
    } else {
      newExpanded.add(teamId);
    }
    setExpandedTeams(newExpanded);
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <NavBar variant="title-back" title="팀 관리" onBack={() => router.push("/admin")} />

      <div className="flex-1 bg-neutral-3 px-4 py-4 relative">
        {/* Toast Message */}
        {toastMessage && (
          <div className="fixed top-7 left-4 right-4 z-50 max-w-[343px] mx-auto bg-orange-5 rounded-lg p-3 flex items-center gap-3 shadow-md">
            <div className="relative shrink-0 size-6">
              <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
                <path d="M12 8v4m0 4h.01" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="typo-body-small text-neutral-2 flex-1">{toastMessage}</p>
          </div>
        )}

        <div className="w-full max-w-[375px] mx-auto space-y-4">
          <SearchBar
            placeholder="팀명으로 검색..."
            value={searchInput}
            onChange={setSearchInput}
            className="h-[48px] rounded-lg bg-neutral-2 border border-neutral-5"
          />

          <div className="flex items-center justify-between">
            <p className="typo-body-small text-neutral-10">
              {search
                ? `${teams.length}개의 팀이 검색되었습니다.`
                : `전체 ${teams.length}개`}
            </p>
            <button
              type="button"
              onClick={() => router.push('/admin/team/new')}
              className="rounded-lg bg-neutral-10 px-4 py-2 typo-body-small-bold text-neutral-2 flex items-center gap-1"
            >
              새 팀 추가
              <span>+</span>
            </button>
          </div>

          {/* Toggle Switch */}
          <div className="bg-neutral-2 rounded-lg p-3 flex items-center gap-3 border border-neutral-4">
            <button
              type="button"
              onClick={() => setSellerOnly(!sellerOnly)}
              className={`relative w-9 h-5 rounded-full transition-colors ${
                sellerOnly ? "bg-neutral-10" : "bg-neutral-6"
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  sellerOnly ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
            <p className="typo-body-small text-neutral-10">판매팀만 보기</p>
          </div>

          {/* Team List */}
          <div className="space-y-3">
            {loading ? (
              <div className="py-8 text-center typo-body-xsmall text-neutral-7">
                로딩 중...
              </div>
            ) : teams.length === 0 ? (
              <div className="py-8 text-center typo-body-xsmall text-neutral-7">
                팀이 없습니다.
              </div>
            ) : (
              teams.map((team) => (
                <div
                  key={team.id}
                  className="rounded-lg border border-neutral-4 bg-neutral-2 overflow-hidden"
                >
                  {/* Team Header */}
                  <div className="p-4 flex items-start justify-between cursor-pointer border-b border-neutral-4 hover:bg-neutral-4 transition-colors" onClick={() => toggleTeam(team.id)}>
                    <div className="flex-1">
                      <h3 className="typo-body-small-bold text-neutral-10">
                        {team.teamName}
                      </h3>
                      <p className="typo-body-xsmall text-neutral-7 mt-1">
                        {team.teamType === 1 ? "판매팀" : "일반팀"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/admin/team/${team.id}/edit`);
                      }}
                      className="flex items-center justify-center shrink-0"
                    >
                      <Image
                        src="/assets/icons/filled/Iconex/Filled/Edit 2.svg"
                        alt="편집"
                        width={24}
                        height={24}
                        style={{ filter: 'brightness(0) saturate(100%) invert(23%) sepia(4%) saturate(1255%) hue-rotate(7deg)' }}
                      />
                    </button>
                  </div>

                  {/* Team Members (Expandable) */}
                  {expandedTeams.has(team.id) && (
                    <>
                      <div className="flex flex-col">
                        {team.members.map((member, idx) => (
                          <div key={idx}>
                            {idx > 0 && <div className="h-px bg-neutral-4" />}
                            <div className="p-4 flex items-center gap-3">
                              <span
                                className={`typo-body-xsmall px-2 py-0.5 rounded whitespace-nowrap ${
                                  member.role === "대표"
                                    ? "bg-orange-3 text-orange-7"
                                    : "bg-neutral-4 text-neutral-9"
                                }`}
                              >
                                {member.role}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="typo-body-xsmall-bold text-neutral-9">
                                  {member.name}
                                </p>
                              </div>
                              <p className="typo-body-xsmall text-neutral-7">
                                {member.phone}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Seller Team Download Link */}
                      {team.teamType === 1 && (
                        <div className="p-4 border-t border-neutral-4">
                          <a
                            href={team.accountUrl || "#"}
                            className="typo-body-xsmall-bold text-neutral-9 underline"
                          >
                            통장 사본 보기
                          </a>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
