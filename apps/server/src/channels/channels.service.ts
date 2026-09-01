import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@mivo/database';
import { CreateChannelInput, UpdateChannelInput, ChannelDTO } from '@mivo/shared';

@Injectable()
export class ChannelsService {
  async createChannel(communityId: string, input: CreateChannelInput): Promise<ChannelDTO> {
    const highestPos = await prisma.channel.findFirst({
      where: { communityId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const position = input.position ?? (highestPos ? highestPos.position + 1 : 0);

    const channel = await prisma.channel.create({
      data: {
        communityId,
        name: input.name.toLowerCase(),
        topic: input.topic,
        type: input.type,
        isPrivate: input.isPrivate,
        position,
      },
    });

    return {
      id: channel.id,
      communityId: channel.communityId,
      name: channel.name,
      topic: channel.topic,
      type: channel.type,
      position: channel.position,
      isPrivate: channel.isPrivate,
      createdAt: channel.createdAt.toISOString(),
      rooms: [],
    };
  }

  async updateChannel(channelId: string, input: UpdateChannelInput): Promise<ChannelDTO> {
    const existing = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException({ code: 'CHANNEL_NOT_FOUND', message: 'Channel not found' });
    }

    const updated = await prisma.channel.update({
      where: { id: channelId },
      data: {
        ...(input.name && { name: input.name.toLowerCase() }),
        ...(input.topic !== undefined && { topic: input.topic }),
        ...(input.isPrivate !== undefined && { isPrivate: input.isPrivate }),
        ...(input.position !== undefined && { position: input.position }),
      },
    });

    return {
      id: updated.id,
      communityId: updated.communityId,
      name: updated.name,
      topic: updated.topic,
      type: updated.type,
      position: updated.position,
      isPrivate: updated.isPrivate,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async deleteChannel(channelId: string): Promise<void> {
    const existing = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException({ code: 'CHANNEL_NOT_FOUND', message: 'Channel not found' });
    }

    await prisma.channel.update({
      where: { id: channelId },
      data: { deletedAt: new Date() },
    });
  }
}
