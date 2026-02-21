"use client";
import React, { useEffect, useState } from "react";
import TeamCard from "@/components/admin/TeamCard";
import TeamModal from "@/components/admin/TeamModal";

export default function TeamPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/teams");
      const json = await res.json();
      if (json?.status === "success") setTeams(json.data.teams || []);
      else setTeams([]);
    } catch (e) {
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-semibold">팀 관리</h1>
          <p className="text-sm text-neutral-7">팀 생성, 수정 및 멤버 관리를 할 수 있습니다.</p>
        </div>
        <div className="w-full sm:w-auto">
          <button
            className="bg-primary-600 text-white px-4 py-2 rounded w-full sm:w-auto"
            onClick={() => setOpen(true)}
          >
            팀 생성
          </button>
        </div>
      </header>

      <section>
        {loading ? (
          <p>불러오는 중...</p>
        ) : teams.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <p className="text-neutral-9 mb-3">등록된 팀이 없습니다.</p>
            <button className="bg-primary-600 text-white px-4 py-2 rounded" onClick={() => setOpen(true)}>팀 생성</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.map((t) => (
              <TeamCard key={t.id} team={t} onEdit={(team) => { setEditing(team); setOpen(true); }} />
            ))}
          </div>
        )}
      </section>

      {open && (
        <TeamModal
          initialTeam={editing ?? undefined}
          onClose={() => { setOpen(false); setEditing(null); }}
          onCreated={(newTeam: any) => {
            setOpen(false);
            setEditing(null);
            // reload list
            load();
          }}
        />
      )}
    </div>
  );
}
