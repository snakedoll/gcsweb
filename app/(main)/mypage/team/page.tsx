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
      const res = await fetch("/api/v1/admin/team/list");
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
    <div className="p-4 max-w-4xl mx-auto">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">팀 관리</h1>
        <button
          className="bg-primary-600 text-white px-3 py-1 rounded"
          onClick={() => setOpen(true)}
        >
          팀 생성
        </button>
      </header>

      <section>
        {loading ? (
          <p>불러오는 중...</p>
        ) : teams.length === 0 ? (
          <p>등록된 팀이 없습니다.</p>
        ) : (
          <div className="grid gap-3">
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
