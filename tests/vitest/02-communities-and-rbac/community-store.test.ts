import { describe, it, expect, beforeEach } from 'vitest';
import { useCommunityStore } from '@/stores/communityStore';
import { CommunityDTO, CommunityDetailsDTO } from '@mivo/shared';

describe('Community Store & Multi-Tenant RBAC Workspaces', () => {
  beforeEach(() => {
    useCommunityStore.setState({
      communities: [],
      activeCommunity: null,
      members: [],
      isLoading: false,
    });
  });

  it('initializes with empty communities array and inactive community', () => {
    const state = useCommunityStore.getState();
    expect(state.communities).toEqual([]);
    expect(state.activeCommunity).toBeNull();
    expect(state.members).toEqual([]);
    expect(state.isLoading).toBe(false);
  });

  it('populates communities array and preserves community metadata', () => {
    const mockCommunities: CommunityDTO[] = [
      {
        id: 'comm-1',
        name: 'Wysbryx Engineering',
        slug: 'wysbryx-engineering',
        description: 'Core Engineering Organization',
        iconUrl: null,
        bannerUrl: null,
        visibility: 'PRIVATE' as const,
        ownerId: 'usr-dev',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'comm-2',
        name: 'Design Guild',
        slug: 'design-guild',
        description: 'UI/UX Design Systems',
        iconUrl: null,
        bannerUrl: null,
        visibility: 'PUBLIC' as const,
        ownerId: 'usr-alex',
        createdAt: new Date().toISOString(),
      },
    ];

    useCommunityStore.setState({ communities: mockCommunities });

    const state = useCommunityStore.getState();
    expect(state.communities).toHaveLength(2);
    expect(state.communities[0].name).toBe('Wysbryx Engineering');
    expect(state.communities[1].slug).toBe('design-guild');
  });

  it('updates activeCommunity details and channels', () => {
    const details: CommunityDetailsDTO = {
      id: 'comm-1',
      name: 'Wysbryx Engineering',
      slug: 'wysbryx-engineering',
      description: 'Core Engineering Organization',
      iconUrl: null,
      bannerUrl: null,
      visibility: 'PRIVATE' as const,
      ownerId: 'usr-dev',
      createdAt: new Date().toISOString(),
      channels: [
        {
          id: 'chn-1',
          name: 'announcements',
          communityId: 'comm-1',
          topic: 'Platform updates',
          position: 0,
          isPrivate: false,
          createdAt: new Date().toISOString(),
        },
      ],
      roles: [],
    };

    useCommunityStore.setState({ activeCommunity: details });

    const state = useCommunityStore.getState();
    expect(state.activeCommunity?.name).toBe('Wysbryx Engineering');
    expect(state.activeCommunity?.channels).toHaveLength(1);
    expect(state.activeCommunity?.channels[0].name).toBe('announcements');
  });
});
