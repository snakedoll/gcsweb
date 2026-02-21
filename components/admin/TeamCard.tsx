import React from 'react';

function initials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function TeamCard({ team, onEdit }: { team: any; onEdit?: (team: any) => void }) {
  const memberCount = team.memberCount ?? (team.memberIds?.length ?? 0);

  return (
    <div className="bg-white border rounded-lg p-4 flex items-center justify-between shadow-sm hover:shadow-md transition">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold">{initials(team.teamName)}</div>
        <div>
          <div className="text-base font-medium text-neutral-12">{team.teamName}</div>
          <div className="text-sm text-neutral-7">멤버 {memberCount}명</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {team.accountUrl ? (
          <span className="text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded-full">판매팀</span>
        ) : (
          <span className="text-xs bg-neutral-100 text-neutral-7 px-2 py-1 rounded-full">일반팀</span>
        )}

        {onEdit && (
          <button
            onClick={() => onEdit(team)}
            className="text-sm text-primary-700 border border-primary-200 px-3 py-1 rounded hover:bg-primary-50"
            aria-label="팀 편집"
          >
            편집
          </button>
        )}
      </div>
    </div>
  );
}
