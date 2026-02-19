import Link from 'next/link';

export default function AdminPage() {
  return (
    <div className="min-h-screen p-4">
      <h1 className="typo-heading-small text-neutral-10 mb-6">관리자 페이지</h1>
      <div className="flex flex-col gap-3">
        <Link
          href="/admin/members"
          className="rounded-lg bg-orange-5 px-4 py-3 text-left typo-body-small-bold text-neutral-2"
        >
          회원 관리
        </Link>
        <button
          type="button"
          className="rounded-lg bg-orange-5 px-4 py-3 text-left typo-body-small-bold text-neutral-2"
        >
          팀 관리
        </button>
      </div>
    </div>
  );
}
