import { UserTier } from './tier.js';

export type UserStatus = 'ONLINE' | 'IDLE' | 'DND' | 'OFFLINE';

export interface UserDTO {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  customStatus: string | null;
  customStatusExpiresAt?: string | null;
  status: UserStatus;
  isGuest?: boolean;
  userTier?: UserTier;
  organizationId?: string | null;
  organizationName?: string | null;
  organizationRole?: string | null;
  organizationHierarchyLevel?: number | null;
  createdAt: string;
  lastSeenAt: string | null;
}

export interface UserSummaryDTO {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  status: UserStatus;
  isGuest?: boolean;
  userTier?: UserTier;
  organizationId?: string | null;
  organizationName?: string | null;
  organizationRole?: string | null;
  organizationHierarchyLevel?: number | null;
  customStatus: string | null;
  customStatusExpiresAt?: string | null;
}


