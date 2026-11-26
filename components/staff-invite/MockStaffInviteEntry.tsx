import { MOCK_STAFF_INVITE_TOKEN } from '@/lib/mocks/pos-staff-invite-service';
import StaffInvitePage from './StaffInvitePage';

export default function MockStaffInviteEntry({ inviteCode, previewFailure }: {
  inviteCode: string;
  previewFailure: boolean;
}) {
  const valid = process.env.NEXT_PUBLIC_SALES_MANAGEMENT_DATA_SOURCE !== 'api' && inviteCode === MOCK_STAFF_INVITE_TOKEN;
  return <StaffInvitePage valid={valid} storeName="잇장샵" previewFailure={previewFailure} />;
}
