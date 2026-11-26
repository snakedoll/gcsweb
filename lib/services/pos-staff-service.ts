export interface PosStaffMember {
  id: string;
  name: string;
  requestedAt: string;
  registeredAt?: string;
}

export interface PosStaffSnapshot {
  pending: PosStaffMember[];
  registered: PosStaffMember[];
  inviteUrl: string;
}

export interface PosStaffService {
  getStaff(): Promise<PosStaffSnapshot>;
  subscribeToInviteChanges?(listener: () => void): () => void;
  approve(id: string): Promise<PosStaffSnapshot>;
  reject(id: string): Promise<PosStaffSnapshot>;
  remove(id: string): Promise<PosStaffSnapshot>;
}

export type PosStaffInviteStatus = 'none' | 'pending' | 'approved' | 'rejected' | 'owner';

export interface PosStaffInvite {
  status: PosStaffInviteStatus;
  store: { name: string; imageUrl: string | null; storeSlug: string };
}

export interface PosStaffInviteRequestResult {
  status: PosStaffInviteStatus;
  storeSlug: string;
}
