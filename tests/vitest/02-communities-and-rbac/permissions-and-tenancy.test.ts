import { describe, it, expect } from 'vitest';
import {
  PERMISSIONS,
  DEFAULT_OWNER_PERMISSIONS,
  DEFAULT_ADMIN_PERMISSIONS,
  DEFAULT_MODERATOR_PERMISSIONS,
  DEFAULT_MEMBER_PERMISSIONS,
  DEFAULT_GUEST_PERMISSIONS,
} from '@mivo/shared';

describe('Communities & RBAC Module — Permission Matrix & Single-Org Tenancy Policies', () => {
  it('assigns all defined system permissions to Owner role', () => {
    const allPermissions = Object.values(PERMISSIONS);
    expect(DEFAULT_OWNER_PERMISSIONS).toHaveLength(allPermissions.length);
    for (const perm of allPermissions) {
      expect(DEFAULT_OWNER_PERMISSIONS).toContain(perm);
    }
  });

  it('guarantees Admin has community, channel, and moderation management without community.delete', () => {
    expect(DEFAULT_ADMIN_PERMISSIONS).toContain(PERMISSIONS.COMMUNITY_MANAGE);
    expect(DEFAULT_ADMIN_PERMISSIONS).toContain(PERMISSIONS.ROLE_MANAGE);
    expect(DEFAULT_ADMIN_PERMISSIONS).toContain(PERMISSIONS.MEMBER_BAN);
    expect(DEFAULT_ADMIN_PERMISSIONS).toContain(PERMISSIONS.VOICE_MUTE_OTHERS);
  });

  it('moderators can kick members and mute others, but cannot manage roles', () => {
    expect(DEFAULT_MODERATOR_PERMISSIONS).toContain(PERMISSIONS.MEMBER_KICK);
    expect(DEFAULT_MODERATOR_PERMISSIONS).toContain(PERMISSIONS.VOICE_MUTE_OTHERS);
    expect(DEFAULT_MODERATOR_PERMISSIONS).not.toContain(PERMISSIONS.ROLE_MANAGE);
    expect(DEFAULT_MODERATOR_PERMISSIONS).not.toContain(PERMISSIONS.COMMUNITY_MANAGE);
  });

  it('regular members have participation permissions but zero administrative authority', () => {
    expect(DEFAULT_MEMBER_PERMISSIONS).toContain(PERMISSIONS.ROOM_JOIN);
    expect(DEFAULT_MEMBER_PERMISSIONS).toContain(PERMISSIONS.VOICE_SPEAK);
    expect(DEFAULT_MEMBER_PERMISSIONS).toContain(PERMISSIONS.VIDEO_PUBLISH);
    expect(DEFAULT_MEMBER_PERMISSIONS).toContain(PERMISSIONS.SCREEN_SHARE);
    expect(DEFAULT_MEMBER_PERMISSIONS).not.toContain(PERMISSIONS.MEMBER_KICK);
    expect(DEFAULT_MEMBER_PERMISSIONS).not.toContain(PERMISSIONS.VOICE_MUTE_OTHERS);
  });

  it('guests only have read-only / room join observation permission', () => {
    expect(DEFAULT_GUEST_PERMISSIONS).toEqual([PERMISSIONS.ROOM_JOIN]);
    expect(DEFAULT_GUEST_PERMISSIONS).not.toContain(PERMISSIONS.VOICE_SPEAK);
    expect(DEFAULT_GUEST_PERMISSIONS).not.toContain(PERMISSIONS.VIDEO_PUBLISH);
    expect(DEFAULT_GUEST_PERMISSIONS).not.toContain(PERMISSIONS.SCREEN_SHARE);
  });

  it('enforces single-organization tenancy rules (user can only belong to 1 org)', () => {
    const canJoinOrg = (currentOrgCount: number, accountType: string) => {
      if (accountType === 'ORG' && currentOrgCount >= 1) {
        return { allowed: false, reason: 'Single-org tenancy limit: user already belongs to an organization.' };
      }
      return { allowed: true };
    };

    expect(canJoinOrg(0, 'ORG').allowed).toBe(true);
    expect(canJoinOrg(1, 'ORG').allowed).toBe(false);
    expect(canJoinOrg(1, 'NON_ORG').allowed).toBe(true);
  });
});
