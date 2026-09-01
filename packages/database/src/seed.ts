import { prisma } from './client.js';
import { PERMISSIONS } from '@mivo/shared';
import * as argon2 from 'argon2';

const PERMISSION_DEFINITIONS = [
  { key: PERMISSIONS.COMMUNITY_MANAGE, name: 'Manage Community', category: 'COMMUNITY', description: 'Edit community settings, icon, banner, and details' },
  { key: PERMISSIONS.COMMUNITY_INVITE, name: 'Create Invites', category: 'COMMUNITY', description: 'Create invitation links for users to join' },
  { key: PERMISSIONS.COMMUNITY_VIEW, name: 'View Community', category: 'COMMUNITY', description: 'Access and view community content' },
  { key: PERMISSIONS.MEMBER_KICK, name: 'Kick Members', category: 'MODERATION', description: 'Remove members from the community' },
  { key: PERMISSIONS.MEMBER_BAN, name: 'Ban Members', category: 'MODERATION', description: 'Permanently ban members from the community' },
  { key: PERMISSIONS.ROLE_MANAGE, name: 'Manage Roles', category: 'RBAC', description: 'Create and assign roles lower than own role' },
  { key: PERMISSIONS.CHANNEL_CREATE, name: 'Create Channels', category: 'CHANNEL', description: 'Create channels in the community' },
  { key: PERMISSIONS.CHANNEL_MANAGE, name: 'Manage Channels', category: 'CHANNEL', description: 'Edit or delete existing channels' },
  { key: PERMISSIONS.ROOM_CREATE, name: 'Create Rooms', category: 'ROOM', description: 'Create unified communication rooms' },
  { key: PERMISSIONS.ROOM_MANAGE, name: 'Manage Rooms', category: 'ROOM', description: 'Edit room settings or change active modes' },
  { key: PERMISSIONS.ROOM_JOIN, name: 'Join Rooms', category: 'ROOM', description: 'Enter rooms and participate' },
  { key: PERMISSIONS.VOICE_SPEAK, name: 'Voice Speak', category: 'VOICE', description: 'Transmit microphone audio' },
  { key: PERMISSIONS.VOICE_MUTE_OTHERS, name: 'Mute Others', category: 'MODERATION', description: 'Server mute other participants' },
  { key: PERMISSIONS.VIDEO_PUBLISH, name: 'Video Publish', category: 'VIDEO', description: 'Transmit webcam video stream' },
  { key: PERMISSIONS.SCREEN_SHARE, name: 'Screen Share', category: 'MEDIA', description: 'Share screen or application window' },
  { key: PERMISSIONS.STREAM_START, name: 'Go Live / Stream', category: 'BROADCAST', description: 'Broadcast live stream to viewer audience' },
];

export async function seed() {
  console.log('🌱 Starting database seed...');

  // 1. Seed Permissions
  console.log('Seeding permissions catalog...');
  for (const perm of PERMISSION_DEFINITIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { name: perm.name, category: perm.category, description: perm.description },
      create: perm,
    });
  }

  // 2. Create Default Dev User
  const devPassword = 'Password123!';
  const passwordHash = await argon2.hash(devPassword);

  const devUser = await prisma.user.upsert({
    where: { email: 'dev@mivo.app' },
    update: {},
    create: {
      email: 'dev@mivo.app',
      username: 'devadmin',
      displayName: 'Mivo Architect',
      passwordHash,
      status: 'ONLINE',
      isEmailVerified: true,
      bio: 'Lead Architect & Core Developer on Mivo Platform',
    },
  });

  console.log(`✅ Seed completed successfully. Dev user: ${devUser.email}`);
}

seed()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
