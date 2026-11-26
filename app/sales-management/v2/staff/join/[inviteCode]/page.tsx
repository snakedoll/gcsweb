import type { Metadata } from 'next';
import MockStaffInviteEntry from '@/components/staff-invite/MockStaffInviteEntry';
import { ApiStaffInvitePage } from '@/components/staff-invite/StaffInvitePage';

export const metadata: Metadata = {
  title: '직원 등록 요청 | GCS',
  robots: { index: false, follow: false },
};

export default function Page({ params, searchParams }: {
  params: { inviteCode: string };
  searchParams: { preview?: string | string[] };
}) {
  if (process.env.NEXT_PUBLIC_SALES_MANAGEMENT_DATA_SOURCE !== 'api') {
    return <MockStaffInviteEntry key={params.inviteCode} inviteCode={params.inviteCode} previewFailure={searchParams.preview === 'error'} />;
  }
  return <ApiStaffInvitePage key={params.inviteCode} inviteCode={params.inviteCode} />;
}
