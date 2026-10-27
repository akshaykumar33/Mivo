import { create } from 'zustand';
import { UserDTO, GuestLimitsDTO, UserTier, TierCapabilitiesDTO, getTierCapabilities } from '@mivo/shared';
import { api } from '@/lib/api-client';
import { realtime } from '@/lib/socket-client';

interface AuthState {
  user: UserDTO | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isNonOrg: boolean;
  isOrg: boolean;
  userTier: UserTier;
  capabilities: TierCapabilitiesDTO;
  isLoading: boolean;
  upgradeModalOpen: boolean;
  anonConnectModalOpen: boolean;
  projectsModalOpen: boolean;
  guestLimits: GuestLimitsDTO | null;
  setUpgradeModalOpen: (open: boolean) => void;
  setAnonConnectModalOpen: (open: boolean) => void;
  setProjectsModalOpen: (open: boolean) => void;
  fetchGuestLimits: () => Promise<void>;
  setAuth: (user: UserDTO, accessToken: string) => void;
  updateUser: (user: Partial<UserDTO>) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const defaultCapabilities = getTierCapabilities('NON_ORG');

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isGuest: false,
  isNonOrg: false,
  isOrg: false,
  userTier: 'NON_ORG',
  capabilities: defaultCapabilities,
  isLoading: true,
  upgradeModalOpen: false,
  anonConnectModalOpen: false,
  projectsModalOpen: false,
  guestLimits: null,

  setUpgradeModalOpen: (open) => set({ upgradeModalOpen: open }),
  setAnonConnectModalOpen: (open) => set({ anonConnectModalOpen: open }),
  setProjectsModalOpen: (open) => set({ projectsModalOpen: open }),

  fetchGuestLimits: async () => {
    try {
      const res = await api.get<GuestLimitsDTO>('/api/v1/auth/limits');
      if (res.success && res.data) {
        set({ guestLimits: res.data });
      }
    } catch {
      // Non-critical
    }
  },

  setAuth: (user, accessToken) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mivo_access_token', accessToken);
    }
    api.setAccessToken(accessToken);
    realtime.connect(accessToken);
    const tier: UserTier = user.userTier || (user.isGuest ? 'GUEST' : user.organizationId ? 'ORG' : 'NON_ORG');
    const isGuest = tier === 'GUEST';
    const isOrg = tier === 'ORG';
    const isNonOrg = tier === 'NON_ORG';
    const capabilities = getTierCapabilities(tier);

    set({
      user,
      accessToken,
      isAuthenticated: true,
      isGuest,
      isNonOrg,
      isOrg,
      userTier: tier,
      capabilities,
      isLoading: false,
    });
    if (isGuest) {
      get().fetchGuestLimits();
    }
  },

  updateUser: (updatedFields) => {
    set((state) => {
      if (!state.user) return { user: null };
      const updatedUser = { ...state.user, ...updatedFields };
      const tier: UserTier = updatedUser.userTier || (updatedUser.isGuest ? 'GUEST' : updatedUser.organizationId ? 'ORG' : 'NON_ORG');
      return {
        user: updatedUser,
        userTier: tier,
        isGuest: tier === 'GUEST',
        isNonOrg: tier === 'NON_ORG',
        isOrg: tier === 'ORG',
        capabilities: getTierCapabilities(tier),
      };
    });
  },

  logout: async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mivo_access_token');
    }
    await api.post('/api/v1/auth/logout');
    api.setAccessToken(null);
    realtime.disconnect();
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isGuest: false,
      isNonOrg: false,
      isOrg: false,
      userTier: 'NON_ORG',
      capabilities: defaultCapabilities,
      guestLimits: null,
      isLoading: false,
    });
  },

  checkAuth: async () => {
    try {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('mivo_access_token') : null;
      if (storedToken) {
        api.setAccessToken(storedToken);
        const profileRes = await api.get<UserDTO>('/api/v1/users/me');
        if (profileRes.success && profileRes.data) {
          get().setAuth(profileRes.data, storedToken);
          return;
        }
      }

      const res = await api.post<{ accessToken: string }>('/api/v1/auth/refresh');
      if (res.success && res.data?.accessToken) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('mivo_access_token', res.data.accessToken);
        }
        api.setAccessToken(res.data.accessToken);
        const profileRes = await api.get<UserDTO>('/api/v1/users/me');
        if (profileRes.success && profileRes.data) {
          get().setAuth(profileRes.data, res.data.accessToken);
          return;
        }
      }
    } catch {
      // Unauthenticated
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mivo_access_token');
    }
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isGuest: false,
      isNonOrg: false,
      isOrg: false,
      userTier: 'NON_ORG',
      capabilities: defaultCapabilities,
      guestLimits: null,
      isLoading: false,
    });
  },
}));
