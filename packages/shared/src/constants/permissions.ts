export const PERMISSIONS = {
  // Community permissions
  COMMUNITY_MANAGE: 'community.manage',
  COMMUNITY_INVITE: 'community.invite',
  COMMUNITY_VIEW: 'community.view',

  // Moderation permissions
  MEMBER_KICK: 'member.kick',
  MEMBER_BAN: 'member.ban',

  // RBAC permissions
  ROLE_MANAGE: 'role.manage',

  // Channel permissions
  CHANNEL_CREATE: 'channel.create',
  CHANNEL_MANAGE: 'channel.manage',
  CHANNEL_DELETE: 'channel.delete',

  // Room permissions
  ROOM_CREATE: 'room.create',
  ROOM_MANAGE: 'room.manage',
  ROOM_JOIN: 'room.join',

  // Media / Communication permissions
  VOICE_SPEAK: 'voice.speak',
  VOICE_MUTE_OTHERS: 'voice.mute_others',
  VIDEO_PUBLISH: 'video.publish',
  SCREEN_SHARE: 'screen.share',
  STREAM_START: 'stream.start',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const SYSTEM_ROLE_NAMES = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MODERATOR: 'Moderator',
  MEMBER: 'Member',
  GUEST: 'Guest',
} as const;

export const DEFAULT_OWNER_PERMISSIONS: PermissionKey[] = Object.values(PERMISSIONS);

export const DEFAULT_ADMIN_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.COMMUNITY_MANAGE,
  PERMISSIONS.COMMUNITY_INVITE,
  PERMISSIONS.MEMBER_KICK,
  PERMISSIONS.MEMBER_BAN,
  PERMISSIONS.ROLE_MANAGE,
  PERMISSIONS.CHANNEL_CREATE,
  PERMISSIONS.CHANNEL_MANAGE,
  PERMISSIONS.ROOM_CREATE,
  PERMISSIONS.ROOM_MANAGE,
  PERMISSIONS.ROOM_JOIN,
  PERMISSIONS.VOICE_SPEAK,
  PERMISSIONS.VOICE_MUTE_OTHERS,
  PERMISSIONS.VIDEO_PUBLISH,
  PERMISSIONS.SCREEN_SHARE,
  PERMISSIONS.STREAM_START,
];

export const DEFAULT_MODERATOR_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.COMMUNITY_INVITE,
  PERMISSIONS.MEMBER_KICK,
  PERMISSIONS.ROOM_MANAGE,
  PERMISSIONS.ROOM_JOIN,
  PERMISSIONS.VOICE_SPEAK,
  PERMISSIONS.VOICE_MUTE_OTHERS,
  PERMISSIONS.VIDEO_PUBLISH,
  PERMISSIONS.SCREEN_SHARE,
];

export const DEFAULT_MEMBER_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.COMMUNITY_INVITE,
  PERMISSIONS.ROOM_JOIN,
  PERMISSIONS.VOICE_SPEAK,
  PERMISSIONS.VIDEO_PUBLISH,
  PERMISSIONS.SCREEN_SHARE,
];

export const DEFAULT_GUEST_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.ROOM_JOIN,
];
