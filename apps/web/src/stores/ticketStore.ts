import { create } from 'zustand';
import { TicketDTO, CreateTicketInput, UpdateTicketInput, REALTIME_EVENTS } from '@mivo/shared';
import { api } from '@/lib/api-client';
import { realtime } from '@/lib/socket-client';

interface TicketState {
  tickets: TicketDTO[];
  isLoading: boolean;
  isModalOpen: boolean;
  selectedTicket: TicketDTO | null;

  setIsModalOpen: (open: boolean) => void;
  setSelectedTicket: (ticket: TicketDTO | null) => void;
  fetchTickets: (communityId?: string, status?: string) => Promise<void>;
  createTicket: (input: CreateTicketInput) => Promise<TicketDTO | null>;
  updateTicket: (id: string, input: UpdateTicketInput) => Promise<TicketDTO | null>;
  setupRealtimeListeners: () => () => void;
}

export const useTicketStore = create<TicketState>((set, get) => ({
  tickets: [],
  isLoading: false,
  isModalOpen: false,
  selectedTicket: null,

  setIsModalOpen: (open) => set({ isModalOpen: open }),
  setSelectedTicket: (ticket) => set({ selectedTicket: ticket }),

  fetchTickets: async (communityId, status) => {
    set({ isLoading: true });
    try {
      const params = new URLSearchParams();
      if (communityId) params.append('communityId', communityId);
      if (status) params.append('status', status);

      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get<TicketDTO[]>(`/api/v1/tickets${query}`);
      if (res.success && res.data && Array.isArray(res.data)) {
        set({ tickets: res.data });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  createTicket: async (input) => {
    const res = await api.post<TicketDTO>('/api/v1/tickets', input);
    if (res.success && res.data) {
      const created = res.data;
      set((state) => ({
        tickets: [created, ...state.tickets],
      }));
      return created;
    }
    return null;
  },

  updateTicket: async (id, input) => {
    const res = await api.patch<TicketDTO>(`/api/v1/tickets/${id}`, input);
    if (res.success && res.data) {
      const updated = res.data;
      set((state) => ({
        tickets: state.tickets.map((t) => (t.id === id ? updated : t)),
        selectedTicket: state.selectedTicket?.id === id ? updated : state.selectedTicket,
      }));
      return updated;
    }
    return null;
  },

  setupRealtimeListeners: () => {
    const handleTicketCreated = (ticket: TicketDTO) => {
      set((state) => {
        if (state.tickets.some((t) => t.id === ticket.id)) return state;
        return { tickets: [ticket, ...state.tickets] };
      });
    };

    const handleTicketUpdated = (ticket: TicketDTO) => {
      set((state) => ({
        tickets: state.tickets.map((t) => (t.id === ticket.id ? ticket : t)),
        selectedTicket: state.selectedTicket?.id === ticket.id ? ticket : state.selectedTicket,
      }));
    };

    realtime.on(REALTIME_EVENTS.TICKET_CREATED, handleTicketCreated);
    realtime.on(REALTIME_EVENTS.TICKET_UPDATED, handleTicketUpdated);

    return () => {
      realtime.off(REALTIME_EVENTS.TICKET_CREATED, handleTicketCreated);
      realtime.off(REALTIME_EVENTS.TICKET_UPDATED, handleTicketUpdated);
    };
  },
}));
