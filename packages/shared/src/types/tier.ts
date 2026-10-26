export type UserTier = 'GUEST' | 'NON_ORG' | 'ORG';

export interface TierCapabilitiesDTO {
  tier: UserTier;
  tierName: string;
  badgeLabel: string;
  badgeColor: string;
  // Feature Capabilities
  canPublishProjects: boolean;
  canBuildCommunities: boolean;
  canMessage: boolean;
  canCall: boolean;
  canPlayGames: boolean;
  canConnectCodeGames: boolean; // Guests can connect with another guest and play games with connection code
  canUseLiveCodeSharing: boolean;
  canUseAiGeneral: boolean;
  canUseVoiceToTask: boolean; // Only ORG users
  canViewNonOrgProfiles: boolean; // GUEST can view non-org accounts profile
  hasOrgHierarchy: boolean; // ORG users have hierarchical system as per rules
  // Storage
  hasUnlimitedStorage: boolean;
  maxUploadSizeBytes: number | null; // null for unlimited
  storageLimitFormatted: string;
  sessionIsTemporary: boolean;
}

export function getTierCapabilities(tier: UserTier): TierCapabilitiesDTO {
  switch (tier) {
    case 'GUEST':
      return {
        tier: 'GUEST',
        tierName: 'Guest User',
        badgeLabel: 'Guest • Limited',
        badgeColor: 'amber',
        canPublishProjects: false,
        canBuildCommunities: false,
        canMessage: false,
        canCall: false,
        canPlayGames: true, // Only via connection code
        canConnectCodeGames: true,
        canUseLiveCodeSharing: false,
        canUseAiGeneral: false,
        canUseVoiceToTask: false,
        canViewNonOrgProfiles: true,
        hasOrgHierarchy: false,
        hasUnlimitedStorage: false,
        maxUploadSizeBytes: 2 * 1024 * 1024, // 2MB
        storageLimitFormatted: '2 MB',
        sessionIsTemporary: true,
      };

    case 'NON_ORG':
      return {
        tier: 'NON_ORG',
        tierName: 'Independent Developer',
        badgeLabel: 'Creator • Dev',
        badgeColor: 'cyan',
        canPublishProjects: true,
        canBuildCommunities: true,
        canMessage: true,
        canCall: true,
        canPlayGames: true,
        canConnectCodeGames: true,
        canUseLiveCodeSharing: true, // live sharing code with contacted dev
        canUseAiGeneral: true,
        canUseVoiceToTask: false, // NO voice-to-task commands for non-org
        canViewNonOrgProfiles: true,
        hasOrgHierarchy: false,
        hasUnlimitedStorage: false,
        maxUploadSizeBytes: 100 * 1024 * 1024, // 100MB
        storageLimitFormatted: '100 MB',
        sessionIsTemporary: false,
      };

    case 'ORG':
      return {
        tier: 'ORG',
        tierName: 'Organization Member',
        badgeLabel: 'Enterprise Org',
        badgeColor: 'purple',
        canPublishProjects: true,
        canBuildCommunities: true,
        canMessage: true,
        canCall: true,
        canPlayGames: false, // NO games for org users
        canConnectCodeGames: false,
        canUseLiveCodeSharing: true,
        canUseAiGeneral: true,
        canUseVoiceToTask: true, // ALL AI features including voice to task commands
        canViewNonOrgProfiles: true,
        hasOrgHierarchy: true, // Hierarchical system as per rules
        hasUnlimitedStorage: true, // No storage limit
        maxUploadSizeBytes: null, // Unlimited
        storageLimitFormatted: 'Unlimited',
        sessionIsTemporary: false,
      };
  }
}

export interface ProjectDTO {
  id: string;
  title: string;
  description: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl?: string | null;
  demoUrl?: string | null;
  githubUrl?: string | null;
  tags: string[];
  codeSnippet?: string | null;
  language?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  title: string;
  description: string;
  demoUrl?: string;
  githubUrl?: string;
  tags?: string[];
  codeSnippet?: string;
  language?: string;
}
