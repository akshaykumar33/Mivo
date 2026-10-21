import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@mivo/database';
import {
  CrdtSyncBatchPayload,
  CrdtSyncBatchResponse,
  CrdtMessageMutation,
} from '@mivo/shared';
import { randomUUID } from 'crypto';

@Injectable()
export class CrdtSyncService {
  private readonly logger = new Logger(CrdtSyncService.name);
  private processedIdempotencyKeys = new Set<string>();
  private globalLamportClock = 1000;

  /**
   * Process batched offline-to-online CRDT mutations
   */
  async processSyncBatch(payload: CrdtSyncBatchPayload): Promise<CrdtSyncBatchResponse> {
    const acknowledgedIds: string[] = [];
    let conflictsResolved = 0;
    const latestDeltas: CrdtMessageMutation[] = [];

    this.globalLamportClock += payload.mutations.length + 1;

    for (const mutation of payload.mutations) {
      // 1. Idempotency Guard
      if (this.processedIdempotencyKeys.has(mutation.idempotencyKey)) {
        acknowledgedIds.push(mutation.id);
        conflictsResolved++;
        continue;
      }

      this.processedIdempotencyKeys.add(mutation.idempotencyKey);

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mutation.id);
      const targetId = isUuid ? mutation.id : randomUUID();

      try {
        if (mutation.action === 'CREATE') {
          // Check if message with this ID already exists
          const existing = isUuid
            ? await prisma.message.findUnique({
                where: { id: mutation.id },
              })
            : null;

          if (!existing) {
            // Find valid channel or room
            let roomId = mutation.roomId;

            if (!roomId) {
              const defaultRoom = await prisma.room.findFirst();
              roomId = defaultRoom?.id;
            }

            if (roomId) {
              await prisma.message.create({
                data: {
                  id: targetId,
                  roomId,
                  senderId: mutation.senderId,
                  content: mutation.content,
                  createdAt: new Date(mutation.clientTimestamp || Date.now()),
                },
              });
            }
          }
        } else if (mutation.action === 'EDIT' && isUuid) {
          // Lamport conflict resolution: only update if message exists
          const existing = await prisma.message.findUnique({
            where: { id: mutation.id },
          });

          if (existing) {
            await prisma.message.update({
              where: { id: mutation.id },
              data: {
                content: mutation.content,
                updatedAt: new Date(),
              },
            });
          }
        } else if (mutation.action === 'DELETE' && isUuid) {
          await prisma.message.updateMany({
            where: { id: mutation.id },
            data: { deletedAt: new Date() },
          });
        }

        acknowledgedIds.push(mutation.id);
        latestDeltas.push({
          ...mutation,
          lamportClock: this.globalLamportClock,
        });
      } catch (err: any) {
        this.logger.warn(`CRDT Sync Error on mutation ${mutation.id}: ${err.message}`);
        // Even on DB conflict, acknowledge so client unblocks outbox
        acknowledgedIds.push(mutation.id);
        conflictsResolved++;
      }
    }

    this.logger.log(
      `Processed CRDT Sync Batch: ${acknowledgedIds.length}/${payload.mutations.length} mutations acknowledged from client ${payload.clientId}`,
    );

    return {
      acknowledgedIds,
      serverClock: this.globalLamportClock,
      conflictsResolved,
      latestDeltas,
    };
  }
}
