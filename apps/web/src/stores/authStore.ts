import { create } from 'zustand';
import { UserDTO, GuestLimitsDTO } from '@mivo/shared';
import { api } from '@/lib/api-client';
import { realtime } from '@/lib/socket-client';

interface AuthState {
  user: UserDTO | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  upgradeModalOpen: boolean;
  anonConnectModalOpen: boolean;
  guestLimits: GuestLimitsDTO | null;
  setUpgradeModalOpen: (open: boolean) => void;
  setAnonConnectModalOpen: (open: boolean) => void;
  fetchGuestLimits: () => Promise<void>;
  setAuth: (user: UserDTO, accessToken: string) => void;
  updateUser: (user: Partial<UserDTO>) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isGuest: false,
  isLoading: true,
  upgradeModalOpen: false,
  anonConnectModalOpen: false,
  guestLimits: null,

  setUpgradeModalOpen: (open) => set({ upgradeModalOpen: open }),
  setAnonConnectModalOpen: (open) => set({ anonConnectModalOpen: open }),

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
    const isGuest = Boolean(user.isGuest);
    set({
      user,
      accessToken,
      isAuthenticated: true,
      isGuest,
      isLoading: false,
    });
    if (isGuest) {
      get().fetchGuestLimits();
    }
  },

  updateUser: (updatedFields) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...updatedFields } : null,
    }));
  },

  logout: async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mivo_access_token');
    }
    await api.post('/api/v1/auth/logout');
    api.setAccessToken(null);
    realtime.disconnect();
    set({ user: null, accessToken: null, isAuthenticated: false, isGuest: false, guestLimits: null, isLoading: false });
  },

  checkAuth: async () => {
    try {
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
    set({ user: null, accessToken: null, isAuthenticated: false, isGuest: false, guestLimits: null, isLoading: false });
  },
}));
