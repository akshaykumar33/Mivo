import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '@/stores/authStore';

describe('Auth & Identity Module — Zustand Auth Store', () => {
  beforeEach(() => {
    // Reset store to unauthenticated state before each test
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isGuest: false,
      isNonOrg: false,
      isOrg: false,
      upgradeModalOpen: false,
    });
  });

  it('initializes with unauthenticated default state', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isGuest).toBe(false);
    expect(state.isOrg).toBe(false);
  });

  it('sets user and sets org/guest computed flags for an enterprise user', () => {
    const enterpriseUser: any = {
      id: 'usr-dev-1',
      email: 'dev@mivo.app',
      username: 'dev_admin',
      displayName: 'Dev Admin',
      avatarUrl: 'https://cdn.mivo.app/avatars/dev.png',
      userTier: 'ORG' as const,
      organizationId: 'org-enterprise-1',
      role: 'SUPERADMIN' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    useAuthStore.getState().setAuth(enterpriseUser, 'access-token-123');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.id).toBe('usr-dev-1');
    expect(state.isOrg).toBe(true);
    expect(state.isGuest).toBe(false);
    expect(state.isNonOrg).toBe(false);
    expect(state.accessToken).toBe('access-token-123');
  });

  it('sets correct flags for guest users', () => {
    const guestUser: any = {
      id: 'usr-guest-99',
      email: 'guest-99@mivo.app',
      username: 'guest_alex',
      displayName: 'Guest Alex',
      avatarUrl: '',
      isGuest: true,
      userTier: 'GUEST' as const,
      role: 'GUEST' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    useAuthStore.getState().setAuth(guestUser, 'guest-token-123');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.isGuest).toBe(true);
    expect(state.isOrg).toBe(false);
    expect(state.isNonOrg).toBe(false);
  });

  it('toggles upgrade modal state', () => {
    expect(useAuthStore.getState().upgradeModalOpen).toBe(false);
    useAuthStore.getState().setUpgradeModalOpen(true);
    expect(useAuthStore.getState().upgradeModalOpen).toBe(true);
    useAuthStore.getState().setUpgradeModalOpen(false);
    expect(useAuthStore.getState().upgradeModalOpen).toBe(false);
  });

  it('clears state upon logout', async () => {
    useAuthStore.getState().setAuth(
      {
        id: 'usr-1',
        email: 'user@mivo.app',
        username: 'user1',
        displayName: 'User 1',
        avatarUrl: null,
        userTier: 'NON_ORG',
        role: 'MEMBER' as any,
        createdAt: '',
        updatedAt: '',
      } as any,
      'token-123'
    );

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });
});
