import { RoleDTO } from './rbac.js';
import { UserSummaryDTO } from './user.js';
import { ChannelDTO } from './channel.js';

export type VisibilityType = 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';

export interface CommunityDTO {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
  bannerUrl: string | null;
  ownerId: string;
  visibility: VisibilityType;
  memberCount?: number;
  createdAt: string;
}

export interface CommunityMemberDTO {
  id: string;
  communityId: string;
  userId: string;
  nickname: string | null;
  role: RoleDTO;
  user: UserSummaryDTO;
  joinedAt: string;
}

export interface CommunityDetailsDTO extends CommunityDTO {
  channels: ChannelDTO[];
  roles: RoleDTO[];
  currentUserRole?: RoleDTO;
}
