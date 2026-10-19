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
  createdAt: string;
  lastSeenAt: string | null;
}

export interface UserSummaryDTO {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  status: UserStatus;
  customStatus: string | null;
  customStatusExpiresAt?: string | null;
}

