import { UserSummaryDTO } from './user.js';

export type ExternalMeetingProvider = 'GOOGLE_MEET' | 'MS_TEAMS';

export type ExternalMeetingStatus = 'ACTIVE' | 'SCHEDULED' | 'CONCLUDED';

export interface ExternalMeetingDTO {
  id: string;
  provider: ExternalMeetingProvider;
  title: string;
  meetingUrl: string;
  meetingCode: string;
  passcode?: string;
  dialIn?: string;
  conferenceId?: string;
  createdBy: UserSummaryDTO;
  createdAt: string;
  scheduledFor?: string;
  status: ExternalMeetingStatus;
  channelId?: string;
  roomId?: string;
  conversationId?: string;
}

export interface ExternalMeetingBridgeDTO {
  roomId?: string;
  conversationId?: string;
  meeting: ExternalMeetingDTO;
  activatedAt: string;
  activatedBy: UserSummaryDTO;
}

export interface ExternalMeetingConfigDTO {
  google: {
    isConfigured: boolean;
    mode: 'HYBRID_INSTANT' | 'OAUTH_ACTIVE';
    clientId?: string;
  };
  teams: {
    isConfigured: boolean;
    mode: 'HYBRID_INSTANT' | 'OAUTH_ACTIVE';
    tenantId?: string;
  };
}
