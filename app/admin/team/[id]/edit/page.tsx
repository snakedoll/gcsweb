"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { NavBar } from "@/components/layout";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/button/Button";
import RadioButton from "@/components/ui/button/RadioButton";
import { useSession } from "next-auth/react";
import Image from "next/image";

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
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showLeaderModal, setShowLeaderModal] = useState(false);
  const [memberInputValue, setMemberInputValue] = useState("");

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

  const removeMember = (id: string) => {
    setMemberIds((s) => s.filter((x) => x !== id));
    if (leaderId === id) setLeaderId(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // send patch to API (not implemented here)
      // await fetch(`/api/v1/admin/teams/${params.id}`, { method: 'PUT', body: JSON.stringify({ ... }) })
      router.push('/admin/team?toast=updated');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
                  <div className={`rounded-lg ${teamType === 0 ? 'bg-orange-1' : ''} p-3`}>
                    <label className="flex items-center gap-3">
                      <RadioButton checked={teamType === 0} onChange={() => setTeamType(0)} label="일반팀" />
                    </label>
                  </div>
                  <div className={`rounded-lg ${teamType === 1 ? 'bg-orange-1' : ''} p-3`}>
                    <label className="flex items-center gap-3">
                      <RadioButton checked={teamType === 1} onChange={() => setTeamType(1)} label="판매팀" />
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <TextField id="teamName" label="팀명" placeholder="예) 제작담" showStar inputProps={{ value: teamName, onChange: (e) => setTeamName(e.target.value) }} />
              </div>
            </div>
          </div>

          <div>
            <h2 className="typo-heading-xsmall text-neutral-12 mb-3">팀원</h2>
            <div className="rounded-lg bg-neutral-2 p-4 space-y-3 border border-neutral-4">
              <label className="typo-body-small-bold text-neutral-10 flex items-center gap-1">팀장</label>
              <button type="button" onClick={() => setShowLeaderModal(true)} className="w-full rounded-lg border border-neutral-6 bg-neutral-2 p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5"><Image src={CROWN_ICON} alt="crown" width={20} height={20} /></div>
                  <span className="typo-body-xsmall">팀장 선택하기</span>
                </div>
                <div className="w-5 h-5">{ARROW_SVG}</div>
              </button>

              {/* leader preview */}
              {leaderId && sampleMembers.find(m => m.id === leaderId) && (
                <div className="rounded-lg bg-neutral-3 p-4 mt-3 border border-neutral-4">
                  <p className="typo-body-small-bold text-neutral-12">{sampleMembers.find(m => m.id === leaderId)?.name}</p>
                  <p className="typo-body-xsmall text-neutral-9 mt-1">{sampleMembers.find(m => m.id === leaderId)?.major}</p>
                </div>
              )}

              <label className="typo-body-small-bold text-neutral-10 flex items-center gap-1 pt-4">팀원</label>
              <button type="button" onClick={() => setShowMemberModal(true)} className="w-full rounded-lg border border-neutral-6 bg-neutral-2 p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5"><Image src={PLUS_ICON} alt="plus" width={20} height={20} /></div>
                  <span className="typo-body-xsmall">팀원 추가하기</span>
                </div>
                <div className="w-5 h-5">{ARROW_SVG}</div>
              </button>

              {memberIds.filter(id => id !== leaderId).length > 0 && (
                <div className="border border-neutral-4 rounded-lg overflow-hidden">
                  {memberIds.filter(id => id !== leaderId).map((id, idx, arr) => {
                    const member = sampleMembers.find(m => m.id === id);
                    const isLast = idx === arr.length - 1;
                    return (
                      <div key={id}>
                        <div className={`flex items-start justify-between bg-neutral-3 p-4`}>
                          <div className="flex-1">
                            <p className="typo-body-small-bold text-neutral-12">{member?.name}</p>
                            <p className="typo-body-xsmall text-neutral-9 mt-1">{member?.major}</p>
                          </div>
                          <button type="button" className="text-danger text-base leading-none ml-3 flex-shrink-0" onClick={() => removeMember(id)}>✕</button>
                        </div>
                        {!isLast && <div className="h-px bg-neutral-4" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

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
                <div className="mb-28 space-y-3">
                  {sampleMembers.filter(m => (m.name + m.major).includes(memberInputValue)).map(m => (
                    <button key={m.id} type="button" onClick={() => { setMemberIds(s => s.includes(m.id) ? s.filter(x => x !== m.id) : [...s, m.id]); }} className="w-full flex items-center justify-between rounded-lg p-4 bg-neutral-2 border border-neutral-4">
                      <div className="flex-1 text-left">
                        <p className="typo-body-small-bold text-neutral-12">{m.name}</p>
                        <p className="typo-body-xsmall text-neutral-9 mt-1">{m.major}</p>
                      </div>
                      {memberIds.includes(m.id) ? (
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
                  ))}
                </div>
              </div>
              <div className="p-4"><Button type="button" color="black" size="l" onClick={() => setShowMemberModal(false)}>저장하기</Button></div>
            </div>
          </div>
        )}

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
                  <p className="typo-body-xsmall text-neutral-7">이름, 전공, 학번으로 검색...</p>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="10" cy="10" r="6" stroke="#999694" strokeWidth="1.5" />
                    <path d="M15 15l4 4" stroke="#999694" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>

                {/* Member Count */}
                <p className="typo-body-small text-neutral-12 mb-8">전체 {sampleMembers.length}명</p>

                {/* Member List */}
                <div className="mb-28 overflow-hidden rounded-2xl border border-neutral-4">
                  {sampleMembers.map((m, idx) => (
                    <div key={m.id}>
                      <button type="button" onClick={() => setLeaderId(m.id)} className="w-full bg-neutral-2 px-4 py-4 text-left transition-colors hover:bg-neutral-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="typo-body-small-bold text-neutral-12">{m.name}</p>
                            <p className="typo-body-xsmall text-neutral-9 mt-2">{m.major}</p>
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
                      {idx < sampleMembers.length - 1 && <div className="h-px bg-neutral-4" />}
                    </div>
                  ))}
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
