"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { NavBar } from "@/components/layout";
import TextField from "@/components/ui/common/TextField";
import Button from "@/components/ui/button/Button";
import RadioButton from "@/components/ui/button/RadioButton";
import { useSession } from "next-auth/react";
import Image from "next/image";

function formatPhone(phone?: string) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

// local icons
const CROWN_ICON = "/assets/icons/additional/tabler_crown.svg";
const PLUS_ICON = "/assets/icons/additional/Plus.svg";
const ARROW_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" className="w-full h-full">
    <path d="M7.5 15.8333L11.9422 10.6507C12.2632 10.2762 12.2632 9.72362 11.9422 9.34913L7.5 4.16659" stroke="#3F3835" strokeWidth={1.25} strokeLinecap="round" />
  </svg>
);

export default function AdminTeamEditPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session } = useSession();
  const meId = session?.user?.id as string | undefined;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const filePickerRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [accountImage, setAccountImage] = useState<File | null>(null);
  const [accountImageUrl, setAccountImageUrl] = useState<string>("");
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showLeaderModal, setShowLeaderModal] = useState(false);
  const [memberInputValue, setMemberInputValue] = useState("");
  const [leaderSearch, setLeaderSearch] = useState("");

  const sampleMembers = [
    { id: 'kim1', name: '김무성', major: '기계로봇에너지공학과' },
    { id: 'kim2', name: '김무성', major: '기계로봇에너지공학과' },
    { id: 'kim3', name: '김무성', major: '기계로봇에너지공학과' },
  ];

  // form state (prefilled for edit scenario)
  const [teamType, setTeamType] = useState<number>(1);
  const [teamName, setTeamName] = useState<string>('제작담');
  const [memberIds, setMemberIds] = useState<string[]>([sampleMembers[0].id, sampleMembers[1].id]);
  const [leaderId, setLeaderId] = useState<string | null>(sampleMembers[0].id);
  const [loading, setLoading] = useState(false);

  const [allMembersCache, setAllMembersCache] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const candidateMembers = React.useMemo(() => {
    const byId = new Map<string, any>();
    allUsers.forEach((u: any) => {
      if (!u?.id) return;
      byId.set(u.id, u);
    });
    allMembersCache.forEach((m: any) => {
      if (!m?.id || byId.has(m.id)) return;
      byId.set(m.id, m);
    });
    return Array.from(byId.values());
  }, [allUsers, allMembersCache]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/v1/admin/members");
        const json = await res.json();
        if (!mounted || !res.ok) return;
        const users = Array.isArray(json?.members)
          ? json.members.map((m: any) => ({
              id: m.id,
              name: m.name ?? "",
              phone: m.phone ?? "",
              major: m.major ?? "",
              role: m.role,
            }))
          : [];
        setAllUsers(users);
      } catch (e) {
        if (mounted) setAllUsers([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/v1/admin/teams/${params.id}`);
        const json = await res.json();
        if (!mounted) return;
        if (json?.status === 'success' && json.data) {
          const d = json.data;
          if (typeof d.teamType === 'number') setTeamType(d.teamType);
          if (typeof d.teamName === 'string') setTeamName(d.teamName);
          if (d.accountUrl) setAccountImageUrl(d.accountUrl);

          if (Array.isArray(d.members)) {
            // Load backend members into our cache to replace the fixed mock
            const formattedMembers = d.members.map((m: any) => ({
              id: m.id || m.name,
              name: m.name,
              phone: m.phone || '',
              role: m.role
            }));

            // Re-populate our list & cache
            setAllMembersCache(formattedMembers);
            setMemberIds(formattedMembers.map((m: any) => m.id));

            // Set leader if any role is '대표'
            const leader = formattedMembers.find((m: any) => m.role === '대표');
            if (leader) setLeaderId(leader.id);
          }
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const removeMember = (id: string) => {
    setMemberIds((s) => s.filter((x) => x !== id));
    if (leaderId === id) setLeaderId(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let accountUrl: string | null = null;

      if (teamType === 1) {
        // 판매팀인 경우 통장 사본 필요
        if (accountImage) {
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
        } else if (accountImageUrl) {
          // 이미 미리보기 URL이 존재하면 그대로 사용
          accountUrl = accountImageUrl;
        } else {
          alert("판매팀은 팀장 및 통장 사본 이미지가 필요합니다.");
          setLoading(false);
          return;
        }
      }

      const payload: any = {
        teamType,
        teamName: teamName.trim(),
        leaderId: leaderId ?? memberIds[0],
        memberIds,
      };
      if (accountUrl) payload.accountUrl = accountUrl;

      const res = await fetch(`/api/v1/admin/teams/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json?.status === "success") {
        router.push("/admin/team?toast=updated");
      } else {
        alert(json?.message || "서버 오류가 발생했습니다.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="flex min-h-screen w-full flex-col">
      <NavBar variant="title-back" title="팀 수정" onBack={() => router.push('/admin/team')} />

      <div className="flex-1 bg-neutral-3 px-4 py-4">
        <form onSubmit={onSubmit} className="w-full max-w-[375px] mx-auto space-y-4">
          <div>
            <h2 className="typo-heading-xsmall text-neutral-12 mb-3">팀 정보</h2>
            <div className="rounded-lg bg-neutral-2 p-4 space-y-4 border border-neutral-4">
              <div>
                <label className="typo-body-small-bold text-neutral-10 flex items-center gap-1">
                  팀 구분
                </label>
                <div className="mt-3 space-y-2">
                  <div
                    className={`w-full flex items-center justify-between rounded py-[4px] px-[8px] ${teamType === 0 ? "bg-orange-1" : ""
                      }`}
                  >
                    <label className="flex items-center gap-3 w-full cursor-pointer">
                      <RadioButton
                        checked={teamType === 0}
                        onChange={() => setTeamType(0)}
                        label="일반팀"
                      />
                    </label>
                  </div>

                  <div
                    className={`w-full flex items-center justify-between rounded py-[4px] px-[8px] ${teamType === 1 ? "bg-orange-1" : ""
                      }`}
                  >
                    <label className="flex items-center gap-3 w-full cursor-pointer">
                      <RadioButton
                        checked={teamType === 1}
                        onChange={() => setTeamType(1)}
                        label="판매팀"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <TextField id="teamName" label="팀명" placeholder="예) 제작담" showStar inputProps={{ value: teamName, onChange: (e) => setTeamName(e.target.value), className: "text-[#2F2824]" }} />
              </div>
            </div>
          </div>

          <div>
            <h2 className="typo-heading-xsmall text-neutral-12 mb-3">팀원</h2>
            <div className="rounded-lg bg-neutral-2 p-4 space-y-3 border border-neutral-4">
              <label className="typo-body-small-bold text-neutral-10 flex items-center gap-1">팀장</label>
              <button type="button" onClick={() => setShowLeaderModal(true)} className="w-full rounded-lg border border-neutral-6 bg-neutral-2 p-3 flex items-center justify-between hover:bg-neutral-3 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5"><Image src={CROWN_ICON} alt="crown" width={20} height={20} className="w-full h-full" /></div>
                  <span className="typo-body-xsmall text-neutral-10">팀장 선택하기</span>
                </div>
                <div className="w-5 h-5">{ARROW_SVG}</div>
              </button>

              {/* leader preview */}
              {leaderId && candidateMembers.find(m => m.id === leaderId) && (
                <div className="rounded-lg bg-neutral-3 p-4 mt-3 border border-neutral-4">
                  <p className="typo-body-small-bold text-[#3F3835]">{candidateMembers.find(m => m.id === leaderId)?.name}</p>
                  <p className="typo-body-xsmall text-[#5A5451] mt-1">{(() => { const l = candidateMembers.find(m => m.id === leaderId); return l?.phone ? formatPhone(l.phone) : '-'; })()}</p>
                </div>
              )}

              <label className="typo-body-small-bold text-neutral-10 flex items-center gap-1 pt-4">팀원</label>
              <button type="button" onClick={() => setShowMemberModal(true)} className="w-full rounded-lg border border-neutral-6 bg-neutral-2 p-3 flex items-center justify-between hover:bg-neutral-3 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="relative w-5 h-5 flex-shrink-0"><Image src={PLUS_ICON} alt="plus" width={20} height={20} className="w-full h-full" /></div>
                  <span className="typo-body-xsmall text-neutral-10">팀원 추가하기</span>
                </div>
                <div className="relative w-5 h-5 flex-shrink-0">{ARROW_SVG}</div>
              </button>

              {memberIds.filter(id => id !== leaderId).length > 0 && (
                <div className="border border-neutral-4 rounded-lg overflow-hidden">
                  {/* 최대 6명까지만 보이게 max-height 설정 (약 6 * 64px = 384px) 및 내부 스크롤 */}
                  <div className="max-h-[384px] overflow-y-auto">
                    {memberIds.filter(id => id !== leaderId).map((id, idx, arr) => {
                      const member = candidateMembers.find(m => m.id === id);
                      const isLast = idx === arr.length - 1;
                      return (
                        <div key={id}>
                          <div className="relative bg-neutral-3 p-4">
                            <div className="flex-1">
                              <p className="typo-body-small-bold text-[#3F3835]">{member?.name}</p>
                              <p className="typo-body-xsmall text-[#5A5451] mt-1">{member?.phone ? formatPhone(member.phone) : '-'}</p>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeMember(id)}
                              className="absolute top-3 right-3"
                              aria-label="팀원 삭제"
                            >
                              <div className="w-5 h-5">
                                <Image src="/assets/icons/additional/Close.svg" alt="삭제" width={20} height={20} />
                              </div>
                            </button>
                          </div>
                          {!isLast && <div className="h-px bg-neutral-4" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 정산계좌 섹션 (판매팀만) */}
          {teamType === 1 && (
            <div>
              <h2 className="typo-heading-xsmall text-neutral-12 mb-3">정산계좌</h2>
              <div className="rounded-lg bg-neutral-2 p-4 border border-neutral-4">
                {accountImageUrl ? (
                  <div className="relative rounded-lg overflow-hidden bg-neutral-3 h-48 w-full cursor-pointer" onClick={() => setShowImageModal(true)}>
                    <Image src={accountImageUrl} alt="통장 사본" fill className="object-cover" />
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" onChange={handleAccountImageChange} className="hidden" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <div className="w-8 h-8">
                      <Image src="/assets/icons/filled/Filled/Image.svg" alt="통장 사본 아이콘" width={32} height={32} className="object-contain" />
                    </div>

                    <div className="text-center space-y-1">
                      <p className="typo-body-small text-neutral-8">통장 사본 이미지를 선택해주세요.</p>
                      <p className="typo-body-xsmall text-neutral-7">50MB 이하의 JPEG, PNG 포맷</p>
                    </div>

                    <button type="button" onClick={() => setShowImageModal(true)} className="bg-orange-5 hover:bg-orange-6 typo-body-small-bold text-neutral-2 px-4 py-2 rounded-lg transition-colors">사진 업로드</button>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" onChange={handleAccountImageChange} className="hidden" />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="pt-4 pb-4">
            <Button type="submit" color="orange" size="l" status={loading ? 'disabled' : 'default'} disabled={loading}>{loading ? '수정 중...' : '수정하기'}</Button>
          </div>
        </form>

        {/* Member modal (simplified) */}
        {showMemberModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-3">
            <div className="h-screen w-full max-w-[375px] flex flex-col bg-neutral-3">
              <div className="flex h-[78px] flex-col items-center justify-end border-b border-neutral-5 bg-neutral-3 shadow-sm">
                <div className="flex h-11 w-full items-center justify-between px-4">
                  <button type="button" onClick={() => setShowMemberModal(false)} className="flex h-6 w-3 items-center justify-center">←</button>
                  <h1 className="flex-1 text-center typo-body-small-bold text-neutral-12">팀원 추가</h1>
                  <div className="h-6 w-3" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 pt-6">
                <div className="mb-8 flex h-12 items-center justify-between rounded-lg border border-neutral-5 bg-neutral-2 pl-4 pr-3">
                  <input value={memberInputValue} onChange={(e) => setMemberInputValue(e.target.value)} className="flex-1 bg-transparent" placeholder="이름, 전공, 학번으로 검색..." />
                </div>
                <div className="flex h-[36px] items-center mb-4">
                  <p className="typo-body-small text-neutral-10">전체 {candidateMembers.length}명</p>
                </div>
                <div className="mb-28 border border-neutral-4 rounded-[16px] overflow-hidden bg-neutral-2">
                  {(() => {
                    const keyword = memberInputValue.trim().toLowerCase();
                    const filteredList = candidateMembers.filter((m) => {
                      if (!keyword) return true;
                      const haystack = `${m?.name ?? ''} ${m?.major ?? ''} ${m?.phone ?? ''}`.toLowerCase();
                      return haystack.includes(keyword);
                    });
                    return filteredList.map((m, idx) => {
                      const isLeader = m.id === leaderId;
                      return (
                        <div key={m.id}>
                          <button
                            type="button"
                            onClick={() => { if (!isLeader) setMemberIds(s => s.includes(m.id) ? s.filter(x => x !== m.id) : [...s, m.id]); }}
                            className={`w-full flex items-start justify-between p-4 bg-neutral-2 transition-colors ${isLeader ? 'opacity-50 cursor-not-allowed' : 'hover:bg-neutral-3'}`}
                            disabled={isLeader}
                          >
                            <div className="flex-1 text-left flex flex-col gap-2">
                              <p className="typo-body-small-bold text-[#3F3835] flex items-center gap-2">
                                {m.name}
                                {isLeader && <span className="typo-body-xsmall text-orange-5 bg-orange-1 px-2 py-0.5 rounded">팀장</span>}
                              </p>
                              <p className="typo-body-xsmall text-[#5A5451]">{m.phone ? formatPhone(m.phone) : '-'}</p>
                            </div>
                            <div className="ml-4 flex items-center justify-center h-6 w-6 shrink-0 relative">
                              {memberIds.includes(m.id) ? (
                                <svg className="absolute w-[21.5px] h-[21.5px]" viewBox="0 0 21.5 21.5" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <rect width="21.5" height="21.5" rx="3.75" fill="#C7C5C4" />
                                  <path d="M5.75 10.75h10" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                              ) : (
                                <svg className="absolute w-[21.5px] h-[21.5px]" viewBox="0 0 21.5 21.5" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <rect width="21.5" height="21.5" rx="3.75" fill="#F6874C" />
                                  <path d="M5.75 10.75h10M10.75 5.75v10" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                              )}
                            </div>
                          </button>
                          {idx < filteredList.length - 1 && <div className="h-px bg-neutral-4 w-full" />}
                        </div>
                      )
                    });
                  })()}
                </div>
              </div>
              <div className="p-4"><Button type="button" color="black" size="l" onClick={() => setShowMemberModal(false)}>저장하기</Button></div>
            </div>
          </div>
        )}

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
                    cameraInputRef.current?.click();
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
                    filePickerRef.current?.click();
                    setShowImageModal(false);
                  }}
                  className="w-full py-4 text-center text-orange-5 font-medium bg-white"
                >
                  파일 선택
                </button>
              </div>

              <div className="mt-3 bg-white rounded-2xl overflow-hidden shadow-lg">
                <button type="button" onClick={() => setShowImageModal(false)} className="w-full py-4 text-center text-neutral-7 bg-white">취소하기</button>
              </div>
            </div>
          </div>
        )}

        <input ref={filePickerRef} type="file" accept="*/*" onChange={handleAccountImageChange} className="hidden" />

        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleAccountImageChange} className="hidden" />

        {/* Leader modal (simplified) */}
        {showLeaderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-3">
            <div className="h-screen w-full max-w-[375px] flex flex-col bg-neutral-3">
              <div className="flex h-[78px] flex-col items-center justify-end border-b border-neutral-5 bg-neutral-3 shadow-sm">
                <div className="flex h-11 w-full items-center justify-between px-4">
                  <button type="button" onClick={() => setShowLeaderModal(false)} className="flex h-6 w-3 items-center justify-center">←</button>
                  <h1 className="flex-1 text-center typo-body-small-bold text-neutral-12">팀장 선택</h1>
                  <div className="h-6 w-3" />
                </div>
              </div>
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
                <p className="typo-body-small text-neutral-12 mb-8">전체 {candidateMembers.length}명</p>

                {/* Member List */}
                <div className="mb-28 overflow-hidden rounded-2xl border border-neutral-4">
                  {(() => {
                    const keyword = leaderSearch.trim().toLowerCase();
                    const leaderFiltered = candidateMembers.filter((m) => {
                      if (!keyword) return true;
                      const haystack = `${m?.name ?? ''} ${m?.major ?? ''} ${m?.phone ?? ''}`.toLowerCase();
                      return haystack.includes(keyword);
                    });
                    return leaderFiltered.map((m, idx) => (
                      <div key={m.id}>
                        <button type="button" onClick={() => setLeaderId(m.id)} className="w-full bg-neutral-2 px-4 py-4 text-left transition-colors hover:bg-neutral-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 flex flex-col gap-1">
                              <p className="typo-body-small-bold text-neutral-12">{m.name}</p>
                              <p className="typo-body-xsmall text-neutral-9">{m.phone ? formatPhone(m.phone) : '-'}</p>
                            </div>
                            <div className="ml-4 mt-1">
                              {leaderId === m.id ? (
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
              <div className="p-4"><Button type="button" color="black" size="l" onClick={() => setShowLeaderModal(false)}>선택하기</Button></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
