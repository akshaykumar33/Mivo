import { UserDTO } from './user.js';

export interface AuthSessionResponse {
  user: UserDTO;
  accessToken: string;
  isGuest?: boolean;
}

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  displayName?: string;
  isGuest?: boolean;
  iat?: number;
  exp?: number;
}

export interface GuestLimitsDTO {
  isGuest: boolean;
  maxUploadSizeBytes: number;
  messageCooldownMs: number;
  canCreateCommunity: boolean;
  canManageRoles: boolean;
  canCreateChannels: boolean;
  sessionExpiresAt?: string;
}
