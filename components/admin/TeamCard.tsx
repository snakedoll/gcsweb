import React from 'react';

export default function TeamCard({ team, onEdit }: { team: any; onEdit?: (team: any) => void }) {
  return (
    <div className="border rounded p-3 flex items-center justify-between">
      <div>
        <div className="text-lg font-medium">{team.teamName}</div>
        <div className="text-sm text-neutral-7">멤버수: {team.memberCount ?? (team.memberIds?.length ?? 0)}</div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-sm text-neutral-7">{team.accountUrl ? '판매팀' : '일반팀'}</div>
        {onEdit && (
          <button
            onClick={() => onEdit(team)}
            className="ml-2 px-2 py-1 border rounded text-sm text-neutral-9"
            aria-label="팀 편집"
          >
            편집
          </button>
        )}
      </div>
    </div>
  );
}
