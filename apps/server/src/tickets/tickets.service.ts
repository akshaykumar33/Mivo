import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { prisma } from '@mivo/database';
import {
  TicketDTO,
  CreateTicketInput,
  UpdateTicketInput,
  REALTIME_EVENTS,
} from '@mivo/shared';
import { NotificationsService } from '../notifications/notifications.service.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';

@Injectable()
export class TicketsService {
  constructor(
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => RealtimeGateway))
    private realtimeGateway: RealtimeGateway
  ) {}

  async createTicket(creatorId: string, input: CreateTicketInput): Promise<TicketDTO> {
    const ticket = await prisma.ticket.create({
      data: {
        title: input.title.trim(),
        description: input.description.trim(),
        category: input.category || 'Support',
        priority: input.priority || 'MEDIUM',
        communityId: input.communityId || undefined,
        creatorId,
        assigneeId: input.assigneeId || undefined,
      },
      include: {
        creator: true,
        assignee: true,
      },
    });

    const dto = this.mapToDTO(ticket);

    // Notify assignee if assigned to someone else
    if (input.assigneeId && input.assigneeId !== creatorId) {
      await this.notificationsService
        .createNotification(
          input.assigneeId,
          'TICKET',
          `New Ticket Assigned: ${ticket.title}`,
          `${ticket.creator.displayName} assigned ticket #${ticket.id.slice(0, 8)} (${ticket.priority} priority) to you.`,
          ticket.id,
          { ticketId: ticket.id, priority: ticket.priority, category: ticket.category }
        )
        .catch(() => {});
    }

    try {
      if (this.realtimeGateway?.server) {
        this.realtimeGateway.server.emit(REALTIME_EVENTS.TICKET_CREATED, dto);
      }
    } catch {}

    return dto;
  }

  async listTickets(
    userId: string,
    communityId?: string,
    status?: string
  ): Promise<TicketDTO[]> {
    const where: any = {};

    if (communityId) {
      where.communityId = communityId;
    } else {
      // General user view: tickets created by or assigned to user
      where.OR = [{ creatorId: userId }, { assigneeId: userId }];
    }

    if (status) {
      where.status = status;
    }

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        creator: true,
        assignee: true,
      },
      take: 50,
    });

    return tickets.map((t) => this.mapToDTO(t));
  }

  async getTicket(id: string): Promise<TicketDTO> {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        creator: true,
        assignee: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return this.mapToDTO(ticket);
  }

  async updateTicket(id: string, userId: string, input: UpdateTicketInput): Promise<TicketDTO> {
    const existing = await prisma.ticket.findUnique({
      where: { id },
      include: { creator: true, assignee: true },
    });

    if (!existing) {
      throw new NotFoundException('Ticket not found');
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: {
        ...(input.title && { title: input.title.trim() }),
        ...(input.description && { description: input.description.trim() }),
        ...(input.category && { category: input.category }),
        ...(input.priority && { priority: input.priority }),
        ...(input.status && {
          status: input.status,
          closedAt: input.status === 'RESOLVED' || input.status === 'CLOSED' ? new Date() : null,
        }),
        ...(input.assigneeId !== undefined && { assigneeId: input.assigneeId }),
      },
      include: {
        creator: true,
        assignee: true,
      },
    });

    const dto = this.mapToDTO(updated);

    // If status changed, notify creator if updater is not creator
    if (input.status && input.status !== existing.status && existing.creatorId !== userId) {
      await this.notificationsService
        .createNotification(
          existing.creatorId,
          'TICKET',
          `Ticket ${input.status}: ${updated.title}`,
          `Your ticket #${updated.id.slice(0, 8)} status was updated to ${input.status}.`,
          updated.id,
          { ticketId: updated.id, status: updated.status }
        )
        .catch(() => {});
    }

    // If newly assigned, notify new assignee
    if (input.assigneeId && input.assigneeId !== existing.assigneeId && input.assigneeId !== userId) {
      await this.notificationsService
        .createNotification(
          input.assigneeId,
          'TICKET',
          `Ticket Reassigned: ${updated.title}`,
          `You have been assigned to ticket #${updated.id.slice(0, 8)} (${updated.priority}).`,
          updated.id,
          { ticketId: updated.id, priority: updated.priority }
        )
        .catch(() => {});
    }

    try {
      if (this.realtimeGateway?.server) {
        this.realtimeGateway.server.emit(REALTIME_EVENTS.TICKET_UPDATED, dto);
      }
    } catch {}

    return dto;
  }

  private mapToDTO(t: any): TicketDTO {
    return {
      id: t.id,
      communityId: t.communityId,
      creatorId: t.creatorId,
      assigneeId: t.assigneeId,
      title: t.title,
      description: t.description,
      category: t.category,
      priority: t.priority,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      closedAt: t.closedAt ? t.closedAt.toISOString() : null,
      creator: t.creator
        ? {
            id: t.creator.id,
            username: t.creator.username,
            displayName: t.creator.displayName,
            avatarUrl: t.creator.avatarUrl,
            status: t.creator.status,
            customStatus: t.creator.customStatus,
          }
        : undefined,
      assignee: t.assignee
        ? {
            id: t.assignee.id,
            username: t.assignee.username,
            displayName: t.assignee.displayName,
            avatarUrl: t.assignee.avatarUrl,
            status: t.assignee.status,
            customStatus: t.assignee.customStatus,
          }
        : null,
    };
  }
}
