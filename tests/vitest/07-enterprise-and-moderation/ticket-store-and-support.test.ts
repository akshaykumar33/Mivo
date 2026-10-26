import { describe, it, expect, beforeEach } from 'vitest';
import { useTicketStore } from '@/stores/ticketStore';
import { TicketDTO, TicketPriority, TicketStatus } from '@mivo/shared';

export function filterTickets(
  tickets: TicketDTO[],
  filters: { status?: TicketStatus | 'ALL'; priority?: TicketPriority | 'ALL' }
): TicketDTO[] {
  return tickets.filter((t) => {
    if (filters.status && filters.status !== 'ALL' && t.status !== filters.status) {
      return false;
    }
    if (filters.priority && filters.priority !== 'ALL' && t.priority !== filters.priority) {
      return false;
    }
    return true;
  });
}

describe('Ticket Store and Enterprise Support Workflow', () => {
  beforeEach(() => {
    useTicketStore.setState({
      tickets: [],
      isLoading: false,
      isModalOpen: false,
      selectedTicket: null,
    });
  });

  it('initializes with empty ticket list and closed modal state', () => {
    const state = useTicketStore.getState();
    expect(state.tickets).toEqual([]);
    expect(state.isModalOpen).toBe(false);
    expect(state.selectedTicket).toBeNull();
  });

  it('manages modal visibility and selected ticket references', () => {
    const store = useTicketStore.getState();
    store.setIsModalOpen(true);
    expect(useTicketStore.getState().isModalOpen).toBe(true);

    const mockTicket: TicketDTO = {
      id: 't-101',
      title: 'Audio stutter during 50+ user keynote',
      description: 'Audio jitter buffer drops packets under packet loss simulation.',
      status: 'OPEN',
      priority: 'HIGH',
      category: 'AUDIO',
      creatorId: 'user-reporter',
      assigneeId: null,
      communityId: 'comm-1',
      createdAt: '2026-10-26T10:00:00Z',
      updatedAt: '2026-10-26T10:00:00Z',
      closedAt: null,
    };

    store.setSelectedTicket(mockTicket);
    expect(useTicketStore.getState().selectedTicket?.id).toBe('t-101');
    expect(useTicketStore.getState().selectedTicket?.priority).toBe('HIGH');

    store.setSelectedTicket(null);
    expect(useTicketStore.getState().selectedTicket).toBeNull();
  });

  it('filters ticket collections by status and priority levels', () => {
    const mockTickets: TicketDTO[] = [
      {
        id: 't-1',
        title: 'Crash on Firefox Android',
        description: 'WebRTC getUserMedia permission error',
        status: 'OPEN',
        priority: 'URGENT',
        category: 'WEBRTC',
        creatorId: 'u1',
        assigneeId: null,
        communityId: 'c1',
        createdAt: '2026-10-26T00:00:00Z',
        updatedAt: '2026-10-26T00:00:00Z',
        closedAt: null,
      },
      {
        id: 't-2',
        title: 'Dark mode contrast in tickets list',
        description: 'Border opacity too low on OLED screens',
        status: 'IN_PROGRESS',
        priority: 'LOW',
        category: 'UI',
        creatorId: 'u2',
        assigneeId: null,
        communityId: 'c1',
        createdAt: '2026-10-26T00:00:00Z',
        updatedAt: '2026-10-26T00:00:00Z',
        closedAt: null,
      },
      {
        id: 't-3',
        title: 'MOM email delayed',
        description: 'SMTP queue retry exceeded',
        status: 'RESOLVED',
        priority: 'MEDIUM',
        category: 'EMAIL',
        creatorId: 'u3',
        assigneeId: null,
        communityId: 'c1',
        createdAt: '2026-10-26T00:00:00Z',
        updatedAt: '2026-10-26T00:00:00Z',
        closedAt: '2026-10-26T01:00:00Z',
      },
    ];

    useTicketStore.setState({ tickets: mockTickets });

    const openOnly = filterTickets(mockTickets, { status: 'OPEN' });
    expect(openOnly).toHaveLength(1);
    expect(openOnly[0].id).toBe('t-1');

    const urgentOnly = filterTickets(mockTickets, { priority: 'URGENT' });
    expect(urgentOnly).toHaveLength(1);
    expect(urgentOnly[0].id).toBe('t-1');

    const allFiltered = filterTickets(mockTickets, { status: 'ALL', priority: 'ALL' });
    expect(allFiltered).toHaveLength(3);
  });
});
