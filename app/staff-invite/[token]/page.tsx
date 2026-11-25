import type { Metadata } from 'next';
import MockStaffInviteEntry from '@/components/staff-invite/MockStaffInviteEntry';

export const metadata: Metadata = {
  title: '직원 등록 요청 | GCS',
  robots: { index: false, follow: false },
};

export default function Page({ params, searchParams }: {
  params: { token: string };
  searchParams: { preview?: string | string[] };
}) {
  return <MockStaffInviteEntry key={params.token} inviteCode={params.token} previewFailure={searchParams.preview === 'error'} />;
}
