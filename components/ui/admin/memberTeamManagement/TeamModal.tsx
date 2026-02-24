"use client";
import React, { useState } from "react";

export default function TeamModal({ onClose, onCreate, onCreated, initialTeam }: { onClose: () => void; onCreate?: (data: any) => void; onCreated?: (data: any) => void; initialTeam?: any }) {
  const [teamName, setTeamName] = useState(initialTeam?.teamName ?? "");
  const [accountUrl, setAccountUrl] = useState(initialTeam?.accountUrl ?? "");
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    // fetch current user id to include in memberIds / leaderId when needed
    try {
      setError(null);
      const profileRes = await fetch('/api/v1/mypage/info');
      if (!profileRes.ok) throw new Error('프로필을 불러오지 못했습니다.');
      const profileJson = await profileRes.json();
      const userId = profileJson?.data?.userId;
      if (!userId) throw new Error('사용자 정보를 확인할 수 없습니다.');

      const teamType = accountUrl && accountUrl.trim() ? 1 : 0;
      if (!teamName || !teamName.trim()) {
        setError('팀 이름을 입력하세요.');
        return;
      }
      const payload: any = {
        teamType,
        teamName,
        memberIds: [userId],
      };
      if (teamType === 1) {
        payload.leaderId = userId;
        payload.accountUrl = accountUrl;
      }

      // optimistic local callback
      if (onCreate) onCreate(payload);
      if (onCreated) onCreated(payload);

      // If editing existing team, call update endpoint
      if (initialTeam && initialTeam.id) {
        const body: any = { teamId: initialTeam.id, teamName, accountUrl: accountUrl || undefined, teamType };
        const res = await fetch('/api/v1/admin/team/update', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Failed to update team');
        const json = await res.json();
        if (json?.status !== 'success') throw new Error(json?.message || 'Failed to update team');
        const data = json.data?.team ?? json?.team ?? json;
        if (onCreate) onCreate(data);
        if (onCreated) onCreated(data);
        onClose();
      } else {
        const res = await fetch('/api/v1/admin/team/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to create team');
        const json = await res.json();
        if (json?.status !== 'success') throw new Error(json?.message || 'Failed to create team');
        const data = json.data?.team ?? json?.team ?? json;
        if (onCreate) onCreate(data);
        if (onCreated) onCreated(data);
        onClose();
      }
    } catch (err) {
      console.error(err);
      setError('팀 생성에 실패했습니다.');
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form onSubmit={handleCreate} className="bg-white p-6 rounded shadow z-10 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{initialTeam ? '팀 수정' : '팀 생성'}</h3>
          <button type="button" onClick={onClose} aria-label="닫기" className="text-neutral-7 hover:text-neutral-9">✕</button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <div className="text-sm text-neutral-11 mb-1">팀 이름</div>
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-200"
              placeholder="예: 디자인팀"
            />
          </label>

          <label className="block">
            <div className="text-sm text-neutral-11 mb-1">판매 계정 URL (선택)</div>
            <input
              value={accountUrl}
              onChange={(e) => setAccountUrl(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-200"
              placeholder="https://store.example.com/your-account"
            />
            <div className="text-xs text-neutral-7 mt-1">판매 계정 URL을 입력하면 해당 팀은 판매팀으로 설정됩니다.</div>
          </label>
        </div>

        {error && <div className="text-sm text-danger mt-3">{error}</div>}

        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded">취소</button>
          <button
            type="submit"
            disabled={!teamName.trim()}
            className={`px-4 py-2 text-white rounded ${teamName.trim() ? 'bg-primary-600 hover:bg-primary-700' : 'bg-neutral-4 text-neutral-7 cursor-not-allowed'}`}>
            {initialTeam ? '수정' : '생성'}
          </button>
        </div>
      </form>
    </div>
  );
}
