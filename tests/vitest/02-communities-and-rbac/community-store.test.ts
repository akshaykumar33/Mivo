import { describe, it, expect, beforeEach } from 'vitest';
import { useCommunityStore } from '@/stores/communityStore';

describe('Communities & RBAC Module — Zustand Community Store', () => {
  beforeEach(() => {
    useCommunityStore.setState({
      communities: [],
      activeCommunity: null,
      members: [],
      isLoading: false,
    });
  });

  it('initializes with empty communities array and null activeCommunity', () => {
    const state = useCommunityStore.getState();
    expect(state.communities).toEqual([]);
    expect(state.activeCommunity).toBeNull();
    expect(state.members).toEqual([]);
    expect(state.isLoading).toBe(false);
  });

  it('updates state when communities are populated', () => {
    const mockCommunities = [
      {
        id: 'comm-1',
        name: 'Wysbryx Engineering',
        slug: 'wysbryx-engineering',
        description: 'Core Engineering Organization',
        visibility: 'PRIVATE' as const,
        ownerId: 'usr-dev',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'comm-2',
        name: 'Design Guild',
        slug: 'design-guild',
        description: 'UI/UX Design Systems',
        visibility: 'PUBLIC' as const,
        ownerId: 'usr-alex',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    useCommunityStore.setState({ communities: mockCommunities });

    const state = useCommunityStore.getState();
    expect(state.communities).toHaveLength(2);
    expect(state.communities[0].name).toBe('Wysbryx Engineering');
    expect(state.communities[1].slug).toBe('design-guild');
  });

  it('updates activeCommunity details and spaces', () => {
    const details = {
      id: 'comm-1',
      name: 'Wysbryx Engineering',
      slug: 'wysbryx-engineering',
      description: 'Core Engineering Organization',
      visibility: 'PRIVATE' as const,
      ownerId: 'usr-dev',
      spaces: [
        {
          id: 'spc-1',
          name: 'General',
          communityId: 'comm-1',
          channels: [
            {
              id: 'chn-1',
              name: 'announcements',
              spaceId: 'spc-1',
              mode: 'TEXT' as const,
              isPrivate: false,
            },
          ],
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    useCommunityStore.setState({ activeCommunity: details as any });

    const state = useCommunityStore.getState();
    expect(state.activeCommunity?.name).toBe('Wysbryx Engineering');
    expect(state.activeCommunity?.spaces).toHaveLength(1);
    expect(state.activeCommunity?.spaces[0].channels[0].name).toBe('announcements');
  });
});
