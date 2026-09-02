import { create } from 'zustand';
import { CommunityDTO, CommunityDetailsDTO, CommunityMemberDTO } from '@mivo/shared';
import { api } from '@/lib/api-client';

interface CommunityState {
  communities: CommunityDTO[];
  activeCommunity: CommunityDetailsDTO | null;
  members: CommunityMemberDTO[];
  isLoading: boolean;
  fetchCommunities: () => Promise<void>;
  selectCommunity: (communityId: string) => Promise<void>;
  fetchMembers: (communityId: string) => Promise<void>;
}

export const useCommunityStore = create<CommunityState>((set, get) => ({
  communities: [],
  activeCommunity: null,
  members: [],
  isLoading: false,

  fetchCommunities: async () => {
    set({ isLoading: true });
    const res = await api.get<CommunityDTO[]>('/api/v1/communities');
    if (res.success && res.data) {
      set({ communities: res.data, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  selectCommunity: async (communityId: string) => {
    set({ isLoading: true });
    const res = await api.get<CommunityDetailsDTO>(`/api/v1/communities/${communityId}`);
    if (res.success && res.data) {
      set({ activeCommunity: res.data, isLoading: false });
      get().fetchMembers(communityId);
    } else {
      // Fallback: try fetching all communities and selecting first
      const allRes = await api.get<CommunityDTO[]>('/api/v1/communities');
      if (allRes.success && allRes.data && allRes.data.length > 0) {
        const first = allRes.data[0];
        const firstDetails = await api.get<CommunityDetailsDTO>(`/api/v1/communities/${first.id}`);
        if (firstDetails.success && firstDetails.data) {
          set({ communities: allRes.data, activeCommunity: firstDetails.data, isLoading: false });
          get().fetchMembers(first.id);
          return;
        }
      }
      set({ isLoading: false });
    }
  },

  fetchMembers: async (communityId: string) => {
    const res = await api.get<CommunityMemberDTO[]>(`/api/v1/communities/${communityId}/members`);
    if (res.success && res.data) {
      set({ members: res.data });
    }
  },
}));
