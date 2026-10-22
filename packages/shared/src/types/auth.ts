import { UserDTO } from './user.js';
import { UserTier, TierCapabilitiesDTO } from './tier.js';

export interface AuthSessionResponse {
  user: UserDTO;
  accessToken: string;
  isGuest?: boolean;
  capabilities?: TierCapabilitiesDTO;
}

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  displayName?: string;
  isGuest?: boolean;
  userTier?: UserTier;
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
