"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { NavBar } from "@/components/layout";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/button/Button";
import RadioButton from "@/components/ui/button/RadioButton";
import { useSession } from "next-auth/react";
import Image from "next/image";

type UserItem = { id: string; name: string; phone: string; major: string };

// Figma 아이콘 URL
const CROWN_ICON = "/assets/icons/additional/tabler_crown.svg";
const PLUS_ICON = "/assets/icons/additional/Plus.svg";
const ARROW_ICON = "/assets/icons/additional/Additional/Right-filled.svg";

export default function AdminTeamCreatePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const meId = session?.user?.id as string | undefined;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const memberInputRef = useRef<HTMLInputElement>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showLeaderModal, setShowLeaderModal] = useState(false);
  const [memberInputValue, setMemberInputValue] = useState("");
  const [leaderSearch, setLeaderSearch] = useState("");
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/v1/admin/members");
        const json = await res.json();
        if (!res.ok || cancelled) return;
        const list = (json.members ?? []).map((m: { id: string; name: string; phone?: string; major?: string }) => ({
          id: m.id,
          name: m.name,
          phone: m.phone ?? "",
          major: m.major ?? "",
        }));
        setUsersList(list);
      } catch {
        if (!cancelled) setUsersList([]);
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 기본으로 '판매팀'으로 설정합니다 (요청: 이 화면은 판매팀임)
  const [teamType, setTeamType] = useState<number>(1);
  const [teamName, setTeamName] = useState("");
  const [accountImage, setAccountImage] = useState<File | null>(null);
  const [accountImageUrl, setAccountImageUrl] = useState<string>("");
  const [memberIds, setMemberIds] = useState<string[]>(meId ? [meId] : []);
  const [leaderId, setLeaderId] = useState<string | null>(meId ?? null);
  const [loading, setLoading] = useState(false);

  const addMember = () => {
    const trimmedId = memberInputValue.trim();
    if (!trimmedId) return;
    if (memberIds.includes(trimmedId)) {
      alert("이미 추가된 팀원입니다.");
      return;
    }
    setMemberIds((s) => {
      const next = [...s, trimmedId];
      if (!leaderId) setLeaderId(trimmedId);
      return next;
    });
    setMemberInputValue("");
    setShowMemberModal(false);
  };

  const selectLeader = (id: string) => {
    setLeaderId(id);
  };

  const removeMember = (id: string) => {
    setMemberIds((s) => {
      const next = s.filter((x) => x !== id);
      if (leaderId === id) {
        setLeaderId(next.length > 0 ? next[0] : null);
      }
      return next;
    });
  };

  const handleAccountImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      alert("파일 크기가 50MB를 초과합니다.");
      return;
    }
    const validTypes = ["image/jpeg", "image/png"];
    if (!validTypes.includes(file.type)) {
      alert("JPEG, PNG 포맷만 지원합니다.");
      return;
    }
    setAccountImage(file);
    const url = URL.createObjectURL(file);
    setAccountImageUrl(url);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      alert("팀명을 입력해주세요.");
      return;
    }
    if (!memberIds.length) {
      alert("팀원은 최소 1명이어야 합니다.");
      return;
    }
    if (teamType === 1) {
      if (!leaderId) {
        alert("판매팀은 팀장을 선택해야 합니다.");
        return;
      }
      if (!accountImage) {
        alert("판매팀은 통장 사본 이미지가 필요합니다.");
        return;
      }
    }

    setLoading(true);
    try {
      let accountUrl: string | null = null;
      if (teamType === 1 && accountImage) {
        const form = new FormData();
        form.append("image", accountImage);
        const uploadRes = await fetch("/api/v1/images?usage=BANK_ACCOUNT", { method: "POST", body: form });
        const uploadJson = await uploadRes.json();
        if (uploadJson?.status !== "success" || !uploadJson?.data?.imageUrl) {
          alert(uploadJson?.message ?? "통장 사본 업로드에 실패했습니다.");
          setLoading(false);
          return;
        }
        const path = uploadJson.data.imageUrl as string;
        accountUrl = path.startsWith("http") ? path : `${window.location.origin}${path}`;
      }

      const payload = {
        teamType,
        teamName: teamName.trim(),
        leaderId: leaderId ?? memberIds[0],
        memberIds,
        accountUrl,
      };

      const res = await fetch("/api/v1/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json?.status === "success") {
        router.push("/admin/team?toast=created");
      } else {
        alert(json?.message || "서버 오류가 발생했습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("요청에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = Boolean(
    teamName.trim().length > 0 &&
      memberIds.length > 0 &&
      (teamType === 1
        ? Boolean(leaderId) && accountImage
        : true)
  );

  return (
    <div className="flex min-h-screen w-full flex-col">
      <NavBar
        variant="title-back"
        title="팀 등록"
        onBack={() => router.push("/admin/team")}
      />

      <div className="flex-1 bg-neutral-3 px-4 py-4">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-[375px] mx-auto space-y-4"
        >
          {/* 팀 정보 섹션 */}
          <div>
            <h2 className="typo-heading-xsmall text-neutral-12 mb-3">
              팀 정보
            </h2>
            <div className="rounded-lg bg-neutral-2 p-4 space-y-4 border border-neutral-4">
              <div>
                <label className="typo-body-small-bold text-neutral-10 flex items-center gap-1">
                  팀 구분
                  <span className="typo-body-xsmall-bold text-danger">*</span>
                </label>

                <div className="mt-3 space-y-2">
                  <div
                    className={`rounded-lg ${
                      teamType === 0 ? "bg-orange-1" : ""
                    } p-3`}
                  >
                    <label className="flex items-center gap-3">
                      <RadioButton
                        checked={teamType === 0}
                        onChange={() => setTeamType(0)}
                        label="일반팀"
                      />
                    </label>
                  </div>

                  <div
                    className={`rounded-lg ${
                      teamType === 1 ? "bg-orange-1" : ""
                    } p-3`}
                  >
                    <label className="flex items-center gap-3">
                      <RadioButton
                        checked={teamType === 1}
                        onChange={() => setTeamType(1)}
                        label="판매팀"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <TextField
                  id="teamName"
                  label="팀명"
                  placeholder="예) 제작담"
                  showStar
                  inputProps={{
                    value: teamName,
                    onChange: (e) => setTeamName(e.target.value),
                  }}
                />
              </div>
            </div>
          </div>

          {/* 팀원 섹션 */}
          <div>
            <h2 className="typo-heading-xsmall text-neutral-12 mb-3">팀원</h2>
            <div className="rounded-lg bg-neutral-2 p-4 space-y-3 border border-neutral-4">
              <label className="typo-body-small-bold text-neutral-10 flex items-center gap-1">
                팀장
                <span className="typo-body-xsmall-bold text-danger">*</span>
              </label>

              <button
                type="button"
                onClick={() => setShowLeaderModal(true)}
                className="w-full rounded-lg border border-neutral-6 bg-neutral-2 p-3 flex items-center justify-between hover:bg-neutral-3 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="relative w-5 h-5 flex-shrink-0">
                    <Image
                      src={CROWN_ICON}
                      alt="팀장"
                      width={20}
                      height={20}
                      className="w-full h-full"
                    />
                  </div>
                  <span className="typo-body-xsmall text-neutral-10">
                    팀장 선택하기
                  </span>
                </div>
                <div className="relative w-5 h-5 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" className="w-full h-full">
                    <path d="M7.5 15.8333L11.9422 10.6507C12.2632 10.2762 12.2632 9.72362 11.9422 9.34913L7.5 4.16659" stroke="#3F3835" strokeWidth={1.25} strokeLinecap="round" />
                  </svg>
                </div>
              </button>

              {/* 팀장 정보 카드 */}
              {leaderId && (
                <div className="rounded-lg bg-neutral-3 p-4 mt-3 border border-neutral-4">
                  <p className="typo-body-small-bold text-neutral-12">
                    {usersList.find(m => m.id === leaderId)?.name ?? leaderId}
                  </p>
                  <p className="typo-body-xsmall text-neutral-9 mt-1">
                    {usersList.find(m => m.id === leaderId)?.major ?? ""}
                  </p>
                </div>
              )}

              <label className="typo-body-small-bold text-neutral-10 flex items-center gap-1 pt-4">
                팀원
                <span className="typo-body-xsmall-bold text-danger">*</span>
              </label>

              <button
                type="button"
                onClick={() => setShowMemberModal(true)}
                className="w-full rounded-lg border border-neutral-6 bg-neutral-2 p-3 flex items-center justify-between hover:bg-neutral-3 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="relative w-5 h-5 flex-shrink-0">
                    <Image
                      src={PLUS_ICON}
                      alt="추가"
                      width={20}
                      height={20}
                      className="w-full h-full"
                    />
                  </div>
                  <span className="typo-body-xsmall text-neutral-10">
                    팀원 추가하기
                  </span>
                </div>
                <div className="relative w-5 h-5 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" className="w-full h-full">
                    <path d="M7.5 15.8333L11.9422 10.6507C12.2632 10.2762 12.2632 9.72362 11.9422 9.34913L7.5 4.16659" stroke="#3F3835" strokeWidth={1.25} strokeLinecap="round" />
                  </svg>
                </div>
              </button>

              {/* 팀원 리스트 */}
              {memberIds.filter(id => id !== leaderId).length > 0 && (
                <div className="border border-neutral-4 rounded-lg overflow-hidden">
                  {memberIds.filter(id => id !== leaderId).map((id, idx, arr) => {
                    const member = usersList.find(m => m.id === id);
                    const isLast = idx === arr.length - 1;
                    return (
                      <div key={id}>
                        <div
                          className="flex items-start justify-between bg-neutral-3 p-4"
                        >
                          <div className="flex-1">
                            <p className="typo-body-small-bold text-neutral-12">
                              {member?.name ?? id}
                            </p>
                            <p className="typo-body-xsmall text-neutral-9 mt-1">
                              {member?.major ?? ""}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMember(id)}
                            className="text-danger text-base leading-none ml-3 flex-shrink-0"
                          >
                            ✕
                          </button>
                        </div>
                        {!isLast && <div className="h-px bg-neutral-4" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 정산계좌 섹션 (판매팀만) */}
          {teamType === 1 && (
            <div>
              <h2 className="typo-heading-xsmall text-neutral-12 mb-3">
                정산계좌
              </h2>
              <div className="rounded-lg bg-neutral-2 p-4 border border-neutral-4">
                {accountImageUrl ? (
                  <div className="relative rounded-lg overflow-hidden bg-neutral-3 h-48 w-full">
                    <Image
                      src={accountImageUrl}
                      alt="통장 사본"
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setAccountImage(null);
                        setAccountImageUrl("");
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                      className="absolute top-2 right-2 bg-danger text-white px-3 py-1 rounded text-xs"
                    >
                      제거
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 py-8">
                    {/* 이미지 아이콘 - Figma 설계 */}
                    <div className="w-8 h-8">
                      <Image
                        src="/assets/icons/filled/Iconex/Filled/Image.svg"
                        alt="통장 사본 아이콘"
                        width={32}
                        height={32}
                        className="object-contain"
                      />
                    </div>

                    <div className="text-center space-y-1">
                      <p className="typo-body-small text-neutral-8">
                        통장 사본 이미지를 선택해주세요.
                      </p>
                      <p className="typo-body-xsmall text-neutral-7">
                        50MB 이하의 JPEG, PNG 포맷
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowImageModal(true)}
                      className="bg-orange-5 hover:bg-orange-6 typo-body-small-bold text-neutral-2 px-4 py-2 rounded-lg transition-colors"
                    >
                      사진 업로드
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handleAccountImageChange}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 제출 버튼 */}
          <div className="pt-4 pb-4">
            <Button
              type="submit"
              color="orange"
              size="l"
              status={!isFormValid || loading ? "disabled" : "default"}
              disabled={!isFormValid || loading}
            >
              {loading ? "등록 중..." : "등록하기"}
            </Button>
          </div>
        </form>

        {/* 이미지 선택 모달 */}
        {showImageModal && (
          <div className="fixed inset-0 flex items-end justify-center z-50">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowImageModal(false)} />

            <div className="w-full max-w-md px-4 pb-6 relative">
              <div className="bg-white rounded-2xl overflow-hidden shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowImageModal(false);
                  }}
                  className="w-full py-4 text-center text-orange-5 font-medium bg-white"
                >
                  사진 보관함
                </button>
                <div className="h-px bg-neutral-4" />

                <button
                  type="button"
                  onClick={() => {
                    alert("카메라 기능은 준비 중입니다.");
                    setShowImageModal(false);
                  }}
                  className="w-full py-4 text-center text-orange-5 font-medium bg-white"
                >
                  사진 찍기
                </button>
                <div className="h-px bg-neutral-4" />

                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowImageModal(false);
                  }}
                  className="w-full py-4 text-center text-orange-5 font-medium bg-white"
                >
                  파일 선택
                </button>
              </div>

              <div className="mt-3 bg-white rounded-2xl overflow-hidden shadow-lg">
                <button
                  type="button"
                  onClick={() => setShowImageModal(false)}
                  className="w-full py-4 text-center text-neutral-7 bg-white"
                >
                  취소하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 팀원 추가 모달 */}
        {showMemberModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-3">
            <div className="h-screen w-full max-w-[375px] flex flex-col bg-neutral-3">
              {/* NavBar */}
              <div className="flex h-[78px] flex-col items-center justify-end border-b border-neutral-5 bg-neutral-3 shadow-sm">
                <div className="flex h-11 w-full items-center justify-between px-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMemberModal(false);
                      setMemberInputValue("");
                    }}
                    className="flex h-6 w-3 items-center justify-center"
                    aria-label="back"
                  >
                    <svg width="12" height="24" viewBox="0 0 12 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 2L2 12l8 10" stroke="#3F3835" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <h1 className="flex-1 text-center typo-body-small-bold text-neutral-12">팀원 추가</h1>
                  <div className="h-6 w-3" />
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto px-4 pt-6">
                {/* Search Bar */}
                <div className="mb-8 flex h-12 items-center justify-between rounded-lg border border-neutral-5 bg-neutral-2 pl-4 pr-3">
                  <input
                    type="text"
                    placeholder="이름, 전공, 학번으로 검색..."
                    value={memberInputValue}
                    onChange={(e) => setMemberInputValue(e.target.value)}
                    className="flex-1 bg-transparent typo-body-xsmall text-neutral-12 placeholder:text-neutral-7 focus:outline-none"
                  />
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="10" cy="10" r="6" stroke="#999694" strokeWidth="1.5" />
                    <path d="M15 15l4 4" stroke="#999694" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>

                {/* Member Count */}
                <p className="typo-body-small text-neutral-12 mb-8">전체 {usersList.length}명</p>

                {/* Member List */}
                <div className="mb-28 space-y-3">
                  {usersLoading ? (
                    <p className="typo-body-xsmall text-neutral-9">로딩 중...</p>
                  ) : (
                  usersList
                    .filter((m) =>
                      m.name.includes(memberInputValue) ||
                      (m.phone && m.phone.includes(memberInputValue)) ||
                      m.major.includes(memberInputValue)
                    )
                    .map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => {
                          setMemberIds((s) =>
                            s.includes(member.id) ? s.filter((x) => x !== member.id) : [...s, member.id]
                          );
                        }}
                        className="w-full flex items-center justify-between rounded-lg p-4 bg-neutral-2 border border-neutral-4"
                      >
                        <div className="flex-1 text-left">
                          <p className="typo-body-small-bold text-neutral-12">{member.name}</p>
                          <p className="typo-body-xsmall text-neutral-9 mt-1">{member.major}</p>
                        </div>
                        {memberIds.includes(member.id) ? (
                          <div className="flex ml-4 items-center justify-center h-8 w-8 rounded bg-orange-5">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M6 12h12M12 6v12" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                          </div>
                        ) : (
                          <div className="flex ml-4 items-center justify-center h-8 w-8 rounded bg-neutral-6">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M6 12h12" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Bottom Button */}
              <div className="p-4">
                <Button
                  type="button"
                  color="black"
                  size="l"
                  onClick={() => {
                    setShowMemberModal(false);
                    setMemberInputValue("");
                  }}
                >
                  저장하기
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 팀장 선택 모달 (Figma: 4589:8152) */}
        {showLeaderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-3">
            <div className="h-screen w-full max-w-[375px] flex flex-col bg-neutral-3">
              {/* NavBar */}
              <div className="flex h-[78px] flex-col items-center justify-end border-b border-neutral-5 bg-neutral-3 shadow-sm">
                <div className="flex h-11 w-full items-center justify-between px-4">
                  <button
                    type="button"
                    onClick={() => setShowLeaderModal(false)}
                    className="flex h-6 w-3 items-center justify-center"
                    aria-label="back"
                  >
                    <svg width="12" height="24" viewBox="0 0 12 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 2L2 12l8 10" stroke="#3F3835" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <h1 className="flex-1 text-center typo-body-small-bold text-neutral-12">팀장 선택</h1>
                  <div className="h-6 w-3" />
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto px-4 pt-6">
                {/* Search Bar */}
                <div className="mb-8 flex h-12 items-center justify-between rounded-lg border border-neutral-5 bg-neutral-2 pl-4 pr-3">
                  <input
                    type="text"
                    placeholder="이름, 전공, 학번으로 검색..."
                    value={leaderSearch}
                    onChange={(e) => setLeaderSearch(e.target.value)}
                    className="flex-1 bg-transparent typo-body-xsmall text-neutral-12 placeholder:text-neutral-7 focus:outline-none"
                  />
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="10" cy="10" r="6" stroke="#999694" strokeWidth="1.5" />
                    <path d="M15 15l4 4" stroke="#999694" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>

                {/* Member Count */}
                <p className="typo-body-small text-neutral-12 mb-8">전체 {usersList.length}명</p>

                {/* Member List */}
                <div className="mb-28 overflow-hidden rounded-2xl border border-neutral-4">
                  {usersLoading ? (
                    <p className="typo-body-xsmall text-neutral-9 p-4">로딩 중...</p>
                  ) : (() => {
                    const leaderFiltered = usersList.filter((m) =>
                      m.name.includes(leaderSearch) ||
                      (m.phone && m.phone.includes(leaderSearch)) ||
                      m.major.includes(leaderSearch)
                    );
                    return leaderFiltered.map((member, idx) => (
                    <div key={member.id}>
                      <button
                        type="button"
                        onClick={() => selectLeader(member.id)}
                        className="w-full bg-neutral-2 px-4 py-4 text-left transition-colors hover:bg-neutral-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="typo-body-small-bold text-neutral-12">{member.name}</p>
                            <p className="typo-body-xsmall text-neutral-9 mt-2">{member.major}</p>
                          </div>
                          <div className="ml-4 mt-1">
                            {leaderId === member.id ? (
                              <Image
                                src="http://localhost:3845/assets/c7ba311a28712c18910b68566da1264af8e2acd6.svg"
                                alt="selected"
                                width={24}
                                height={24}
                              />
                            ) : (
                              <Image
                                src="http://localhost:3845/assets/cccab0fded6198009335d639fa7656370c63e78a.svg"
                                alt="unselected"
                                width={24}
                                height={24}
                              />
                            )}
                          </div>
                        </div>
                      </button>
                      {idx < leaderFiltered.length - 1 && <div className="h-px bg-neutral-4" />}
                    </div>
                  ));
                  })()}
                </div>
              </div>

              {/* Bottom Button */}
              <div className="p-4">
                <Button
                  type="button"
                  color="black"
                  size="l"
                  onClick={() => {
                    if (!leaderId) {
                      alert('팀장을 선택해주세요.');
                      return;
                    }
                    setShowLeaderModal(false);
                  }}
                >
                  선택하기
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
