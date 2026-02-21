import NextImage from 'next/image';
import Link from 'next/link';

export default function TeamManagementSection() {
  return (
    <section className="mb-3 rounded-xl border border-neutral-5 bg-neutral-2 px-4 py-4 shadow-[0_1px_2px_0_rgba(99,81,73,0.1)]">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-1">
            <NextImage src="/assets/icons/icon-folder.svg" alt="" width={18} height={18} />
          </span>
          <h2 className="typo-heading-small text-neutral-12">팀 관리</h2>
        </div>
        <span className="rounded bg-orange-1 px-2 py-1 typo-body-xsmall-bold text-orange-7">관리자</span>
      </div>

      <p className="mb-3 typo-body-small text-neutral-8">
        팀 생성, 팀원 관리, 판매 계정 URL 등록까지 한 번에 설정할 수 있어요.
      </p>

      <div className="mb-4 rounded-lg border border-danger-light bg-danger-light px-3 py-2">
        <p className="typo-body-xsmall text-danger">권한이 없는 계정은 팀 수정이 제한됩니다.</p>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/mypage/team"
          className="flex-1 rounded-lg border border-neutral-5 bg-neutral-2 px-3 py-2 text-center typo-body-small text-neutral-10"
        >
          팀 목록 보기
        </Link>

        <Link
          href="/mypage/team"
          className="flex-1 rounded-lg bg-orange-5 px-3 py-2 text-center typo-body-small-bold text-neutral-2"
        >
          팀 생성
        </Link>
      </div>

      <Link href="/mypage/team" className="mt-3 inline-flex items-center gap-1 typo-body-xsmall-bold text-orange-5">
        팀 관리 페이지로 이동
        <NextImage src="/assets/icons/icon-right.svg" alt="" width={16} height={16} />
      </Link>
    </section>
  );
}
