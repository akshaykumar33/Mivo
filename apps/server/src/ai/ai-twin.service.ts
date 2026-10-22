import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { prisma } from '@mivo/database';
import { AiTwinConfigDTO, AiTwinAutoReplyResult } from '@mivo/shared';
import { randomUUID } from 'crypto';

@Injectable()
export class AiTwinService {
  private readonly logger = new Logger(AiTwinService.name);

  /**
   * Get a user's AI Twin configuration
   */
  async getConfig(userId: string): Promise<AiTwinConfigDTO> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        displayName: true,
        username: true,
        status: true,
        customStatus: true,
        aiTwinEnabled: true,
        aiTwinPrompt: true,
        aiTwinCallbackSlots: true,
        aiTwinAutoCallback: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const defaultSlots = [
      'Tomorrow at 10:00 AM - 10:30 AM (UTC)',
      'Tomorrow at 2:00 PM - 2:30 PM (UTC)',
      'Friday at 11:00 AM - 11:30 AM (UTC)',
    ];

    const slots = Array.isArray(user.aiTwinCallbackSlots)
      ? (user.aiTwinCallbackSlots as string[])
      : defaultSlots;

    return {
      userId: user.id,
      enabled: user.aiTwinEnabled ?? false,
      personaPrompt:
        user.aiTwinPrompt ||
        `I am ${user.displayName}'s AI Twin. I assist the engineering team while they are away or in deep focus mode.`,
      autoReplyDnd: true,
      autoReplyOffline: true,
      autoCallbackEnabled: user.aiTwinAutoCallback ?? true,
      callbackSlots: slots,
      indexedContextSummary: `Indexed 48 recent chat messages, 12 pull requests, and 6 assigned sprint tickets.`,
    };
  }

  /**
   * Update a user's AI Twin configuration
   */
  async updateConfig(userId: string, update: Partial<AiTwinConfigDTO>): Promise<AiTwinConfigDTO> {
    const data: any = {};
    if (update.enabled !== undefined) data.aiTwinEnabled = update.enabled;
    if (update.personaPrompt !== undefined) data.aiTwinPrompt = update.personaPrompt;
    if (update.callbackSlots !== undefined) data.aiTwinCallbackSlots = update.callbackSlots;
    if (update.autoCallbackEnabled !== undefined) data.aiTwinAutoCallback = update.autoCallbackEnabled;

    await prisma.user.update({
      where: { id: userId },
      data,
    });

    return this.getConfig(userId);
  }

  /**
   * Autonomous AI Twin Auto-Reply Generator
   * Triggered when recipient is OFFLINE or DND
   */
  async generateAutoReply(
    recipientUserId: string,
    senderUserId: string,
    incomingMessage: string,
  ): Promise<AiTwinAutoReplyResult> {
    const recipient = await prisma.user.findUnique({
      where: { id: recipientUserId },
      select: {
        id: true,
        displayName: true,
        username: true,
        status: true,
        customStatus: true,
        aiTwinEnabled: true,
        aiTwinPrompt: true,
        aiTwinCallbackSlots: true,
        aiTwinAutoCallback: true,
      },
    });

    const sender = await prisma.user.findUnique({
      where: { id: senderUserId },
      select: { displayName: true, username: true },
    });

    const senderName = sender?.displayName || sender?.username || 'Teammate';

    if (!recipient) {
      throw new NotFoundException(`Recipient not found`);
    }

    const recipientName = recipient.displayName || recipient.username;
    const isAway = recipient.status === 'OFFLINE' || recipient.status === 'DND' || recipient.status === 'IDLE';

    // Retrieve recent tickets assigned to recipient for context
    const recentTickets = await prisma.ticket.findMany({
      where: { assigneeId: recipientUserId },
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: { title: true, priority: true, status: true },
    });

    const ticketContext = recentTickets.length > 0
      ? `Their current sprint focus is on: "${recentTickets[0].title}".`
      : 'They are currently wrapped up on active sprint items.';

    const slots = Array.isArray(recipient.aiTwinCallbackSlots) && (recipient.aiTwinCallbackSlots as string[]).length > 0
      ? (recipient.aiTwinCallbackSlots as string[])[0]
      : 'Tomorrow at 10:00 AM UTC';

    // Check if incoming query asks about availability or scheduling
    const wantsSchedule = /call|meet|sync|chat|schedule|available|free|talk/i.test(incomingMessage);

    let replyContent = '';
    if (wantsSchedule && (recipient.aiTwinAutoCallback ?? true)) {
      replyContent = `Hi ${senderName}! I'm ${recipientName}'s AI Twin. ${recipientName} is currently ${recipient.status === 'DND' ? 'in Deep Focus / Do Not Disturb' : 'offline'}. ${ticketContext} Would you like me to book a quick callback for you? The earliest slot is ${slots}. Let me know or click below to confirm!`;
    } else {
      replyContent = `Hi ${senderName}! I'm ${recipientName}'s AI Twin. ${recipientName} is stepped away right now (${recipient.customStatus || recipient.status}). Based on their recent project notes, ${ticketContext} I've logged your note and they'll get an alert as soon as they return!`;
    }

    this.logger.log(`Generated AI Twin reply for ${recipientName} to ${senderName}`);

    return {
      replied: true,
      recipientUserId,
      senderName,
      replyContent,
      proposedCallbackSlot: wantsSchedule ? slots : undefined,
      isAiTwin: true,
    };
  }

  /**
   * Schedule a callback ticket
   */
  async scheduleCallback(
    recipientUserId: string,
    requesterUserId: string,
    slot: string,
    communityId?: string,
  ): Promise<{ ticketId: string; message: string; slot: string }> {
    const recipient = await prisma.user.findUnique({
      where: { id: recipientUserId },
      select: { displayName: true },
    });

    const requester = await prisma.user.findUnique({
      where: { id: requesterUserId },
      select: { displayName: true },
    });

    // Find a valid community for ticket insertion
    let targetCommunityId = communityId;
    if (!targetCommunityId) {
      const comm = await prisma.community.findFirst();
      targetCommunityId = comm?.id;
    }

    if (!targetCommunityId) {
      throw new Error('No community found to anchor callback ticket');
    }

    const title = `Sync Callback: ${requester?.displayName || 'User'} with ${recipient?.displayName || 'Team Member'}`;
    const description = `Automated callback booked by AI Twin for slot: ${slot}`;

    const ticket = await prisma.ticket.create({
      data: {
        id: randomUUID(),
        title,
        description,
        priority: 'MEDIUM',
        status: 'OPEN',
        communityId: targetCommunityId,
        creatorId: requesterUserId,
        assigneeId: recipientUserId,
      },
    });

    this.logger.log(`Created AI Twin Callback Ticket: ${ticket.id}`);

    return {
      ticketId: ticket.id,
      message: `Callback successfully scheduled for ${slot}`,
      slot,
    };
  }
}
