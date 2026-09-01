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

const DEMO_USERS = [
  {
    email: 'dev@mivo.app',
    username: 'devadmin',
    displayName: 'Dev Admin',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    bio: 'Platform Architect & Core System Lead',
    status: 'ONLINE' as const,
  },
  {
    email: 'alex@mivo.app',
    username: 'alex_rivera',
    displayName: 'Alex Rivera',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    bio: 'Staff Product Designer & Interaction Specialist',
    status: 'ONLINE' as const,
  },
  {
    email: 'sarah@mivo.app',
    username: 'sarah_connor',
    displayName: 'Sarah Connor',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    bio: 'Principal Backend Engineer & Real-Time Specialist',
    status: 'IDLE' as const,
  },
  {
    email: 'elena@mivo.app',
    username: 'elena_media',
    displayName: 'Elena Rostova',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    bio: 'WebRTC & Media SFU Infrastructure Engineer',
    status: 'DND' as const,
  },
];

export async function seed() {
  console.log('🌱 Starting comprehensive database seed...');

  // 1. Seed Permissions Catalog
  console.log('1. Seeding permissions catalog...');
  for (const perm of PERMISSION_DEFINITIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { name: perm.name, category: perm.category, description: perm.description },
      create: perm,
    });
  }

  // 2. Create Demo Users
  console.log('2. Seeding demo users (Password: Password123!)...');
  const commonPassword = 'Password123!';
  const passwordHash = await argon2.hash(commonPassword);

  const createdUsers: Record<string, any> = {};

  for (const user of DEMO_USERS) {
    const record = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        status: user.status,
      },
      create: {
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        passwordHash,
        status: user.status,
        isEmailVerified: true,
        bio: user.bio,
      },
    });
    createdUsers[user.email] = record;
    console.log(`   - User seeded: ${record.displayName} (${record.email})`);
  }

  const devAdmin = createdUsers['dev@mivo.app'];
  const allPermissions = await prisma.permission.findMany();

  // Helper to setup a full community with roles, channels, and unified rooms
  async function createFullCommunity(name: string, slug: string, description: string, ownerId: string) {
    console.log(`\n3. Setting up Community: "${name}" (${slug})...`);
    
    // Check if community exists
    let community = await prisma.community.findUnique({ where: { slug } });
    if (!community) {
      community = await prisma.community.create({
        data: {
          name,
          slug,
          description,
          ownerId,
          visibility: 'PUBLIC',
        },
      });
    }

    // Initialize System Roles
    const ownerRole = await prisma.role.upsert({
      where: { communityId_name: { communityId: community.id, name: 'Owner' } },
      update: {},
      create: {
        communityId: community.id,
        name: 'Owner',
        color: '#E0234E',
        position: 1000,
        isSystem: true,
        isDefault: false,
      },
    });

    const adminRole = await prisma.role.upsert({
      where: { communityId_name: { communityId: community.id, name: 'Admin' } },
      update: {},
      create: {
        communityId: community.id,
        name: 'Admin',
        color: '#8B5CF6',
        position: 800,
        isSystem: true,
        isDefault: false,
      },
    });

    const memberRole = await prisma.role.upsert({
      where: { communityId_name: { communityId: community.id, name: 'Member' } },
      update: {},
      create: {
        communityId: community.id,
        name: 'Member',
        color: '#94A3B8',
        position: 100,
        isSystem: true,
        isDefault: true,
      },
    });

    // Assign all permissions to Owner & Admin
    for (const perm of allPermissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: ownerRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: ownerRole.id, permissionId: perm.id },
      });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: adminRole.id, permissionId: perm.id },
      });
    }

    // Default permissions for Member
    const memberPermKeys = [
      PERMISSIONS.COMMUNITY_VIEW,
      PERMISSIONS.ROOM_JOIN,
      PERMISSIONS.VOICE_SPEAK,
      PERMISSIONS.VIDEO_PUBLISH,
      PERMISSIONS.SCREEN_SHARE,
    ];
    for (const perm of allPermissions.filter((p) => memberPermKeys.includes(p.key as any))) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: memberRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: memberRole.id, permissionId: perm.id },
      });
    }

    // Add all demo users as community members
    const memberAssignments = [
      { email: 'dev@mivo.app', roleId: ownerRole.id },
      { email: 'alex@mivo.app', roleId: adminRole.id },
      { email: 'sarah@mivo.app', roleId: adminRole.id },
      { email: 'elena@mivo.app', roleId: memberRole.id },
    ];

    for (const assignment of memberAssignments) {
      const u = createdUsers[assignment.email];
      if (u) {
        await prisma.communityMember.upsert({
          where: { communityId_userId: { communityId: community.id, userId: u.id } },
          update: { roleId: assignment.roleId },
          create: {
            communityId: community.id,
            userId: u.id,
            roleId: assignment.roleId,
          },
        });
      }
    }

    return community;
  }

  // Create Community 1: Wysbryx Core Engineering
  const comm1 = await createFullCommunity(
    'Wysbryx Engineering',
    'wysbryx-core',
    'Core architecture, real-time engines, and platform infrastructure',
    devAdmin.id
  );

  // Channels & Rooms for Community 1
  const chGeneral = await prisma.channel.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      communityId: comm1.id,
      name: 'general',
      topic: 'Team updates and daily engineering discussions',
      type: 'GENERAL',
      position: 0,
    },
  });

  await prisma.room.upsert({
    where: { id: '00000000-0000-0000-0000-000000000011' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000011',
      channelId: chGeneral.id,
      name: 'Lobby',
      description: 'Open discussion and asynchronous chat',
      activeMode: 'TEXT',
    },
  });

  await prisma.room.upsert({
    where: { id: '00000000-0000-0000-0000-000000000012' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000012',
      channelId: chGeneral.id,
      name: 'Daily Standup',
      description: 'Morning sync and progress standup',
      activeMode: 'VIDEO',
    },
  });

  const chVoice = await prisma.channel.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      communityId: comm1.id,
      name: 'voice-lounge',
      topic: 'Drop-in voice calls and open collaboration',
      type: 'VOICE',
      position: 1,
    },
  });

  await prisma.room.upsert({
    where: { id: '00000000-0000-0000-0000-000000000013' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000013',
      channelId: chVoice.id,
      name: 'Open Huddle',
      description: 'Low-latency drop-in voice room',
      activeMode: 'VOICE',
    },
  });

  const chMedia = await prisma.channel.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      communityId: comm1.id,
      name: 'pair-programming',
      topic: 'Live code reviews and screen sharing sessions',
      type: 'MEDIA',
      position: 2,
    },
  });

  await prisma.room.upsert({
    where: { id: '00000000-0000-0000-0000-000000000014' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000014',
      channelId: chMedia.id,
      name: 'Screen Broadcast',
      description: 'High-framerate code inspection',
      activeMode: 'SCREEN_SHARE',
    },
  });

  // Create Community 2: Design Guild
  const comm2 = await createFullCommunity(
    'Design & UX Guild',
    'design-guild',
    'Visual systems, prototypes, motion design, and UI aesthetics',
    createdUsers['alex@mivo.app'].id
  );

  const chDesignGeneral = await prisma.channel.upsert({
    where: { id: '00000000-0000-0000-0000-000000000004' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000004',
      communityId: comm2.id,
      name: 'critique',
      topic: 'Live design critiques and Figma walkthroughs',
      type: 'GENERAL',
      position: 0,
    },
  });

  await prisma.room.upsert({
    where: { id: '00000000-0000-0000-0000-000000000015' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000015',
      channelId: chDesignGeneral.id,
      name: 'Design Stage',
      description: 'Figma review and design critique',
      activeMode: 'SCREEN_SHARE',
    },
  });

  console.log('\n✅ SEED COMPLETED SUCCESSFULLY!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Demo Accounts Ready (Password: Password123!):');
  console.log('  1. dev@mivo.app    -> Dev Admin (Owner of Wysbryx Engineering)');
  console.log('  2. alex@mivo.app   -> Alex Rivera (Owner of Design Guild)');
  console.log('  3. sarah@mivo.app  -> Sarah Connor (Principal Backend Lead)');
  console.log('  4. elena@mivo.app  -> Elena Rostova (Media Engineer)');
  console.log('═══════════════════════════════════════════════════════════');
}

seed()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
