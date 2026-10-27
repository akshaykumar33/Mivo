import { describe, it, expect } from 'vitest';
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  GuestLoginSchema,
  UpdateStatusSchema,
  CreateChannelSchema,
  CreateCommunitySchema,
  CreateDirectConversationSchema,
  CreateGroupConversationSchema,
  SendDirectMessageSchema,
  SendMessageSchema,
  CreateRoomSchema,
  ChangeRoomModeSchema,
  PresignedUrlRequestSchema,
  CreateTicketSchema,
  UpdateTicketSchema,
} from '@mivo/shared';

describe('Shared Zod Schemas Comprehensive Validation', () => {
  describe('Auth Schemas', () => {
    it('validates registration input constraints', () => {
      const valid = RegisterRequestSchema.safeParse({
        email: 'engineer@mivo.app',
        username: 'hyper_coder',
        displayName: 'Hyper Coder',
        password: 'Password123!',
      });
      expect(valid.success).toBe(true);

      const invalidEmail = RegisterRequestSchema.safeParse({
        email: 'invalid-email',
        username: 'hyper_coder',
        displayName: 'Hyper Coder',
        password: 'Password123!',
      });
      expect(invalidEmail.success).toBe(false);

      const weakPassword = RegisterRequestSchema.safeParse({
        email: 'engineer@mivo.app',
        username: 'hyper_coder',
        displayName: 'Hyper Coder',
        password: '123',
      });
      expect(weakPassword.success).toBe(false);
    });

    it('validates guest login displayName requirement', () => {
      const validGuest = GuestLoginSchema.safeParse({ displayName: 'Guest Contributor' });
      expect(validGuest.success).toBe(true);

      const emptyGuest = GuestLoginSchema.safeParse({ displayName: 'A' }); // minimum 2 chars
      expect(emptyGuest.success).toBe(false);
    });

    it('validates user status payload transitions', () => {
      const validStatus = UpdateStatusSchema.safeParse({
        status: 'ONLINE',
        customStatus: 'Pair programming on WebRTC',
      });
      expect(validStatus.success).toBe(true);
    });
  });

  describe('Channel & Community Schemas', () => {
    it('validates create channel schema constraints', () => {
      const validChannel = CreateChannelSchema.safeParse({
        name: 'engineering-general',
        type: 'TEXT',
        topic: 'General engineering chatter',
      });
      expect(validChannel.success).toBe(true);
    });

    it('validates create community schema with slug requirement', () => {
      const validComm = CreateCommunitySchema.safeParse({
        name: 'Acme Enterprise Space',
        slug: 'acme-enterprise-space',
        description: 'Global engineering organization',
      });
      expect(validComm.success).toBe(true);

      const missingSlug = CreateCommunitySchema.safeParse({
        name: 'Acme Enterprise Space',
        description: 'Global engineering organization',
      });
      expect(missingSlug.success).toBe(false);
    });
  });

  describe('Conversation & Messaging Schemas', () => {
    it('validates direct and group conversation inputs', () => {
      const validDirect = CreateDirectConversationSchema.safeParse({
        recipientId: '11111111-1111-4111-8111-111111111111',
      });
      expect(validDirect.success).toBe(true);

      const validGroup = CreateGroupConversationSchema.safeParse({
        name: 'Core Architecture Guild',
        memberIds: ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'],
      });
      expect(validGroup.success).toBe(true);
    });

    it('validates SendDirectMessageSchema requiring content or attachments', () => {
      const validMsg = SendDirectMessageSchema.safeParse({
        content: 'Hello World',
      });
      expect(validMsg.success).toBe(true);

      const emptyMsg = SendDirectMessageSchema.safeParse({
        content: '   ',
      });
      expect(emptyMsg.success).toBe(false);
    });

    it('validates channel SendMessageSchema with character limit', () => {
      const valid = SendMessageSchema.safeParse({
        content: 'Testing channel send',
      });
      expect(valid.success).toBe(true);

      const tooLong = SendMessageSchema.safeParse({
        content: 'x'.repeat(4001),
      });
      expect(tooLong.success).toBe(false);
    });
  });

  describe('Room & Stage Schemas', () => {
    it('validates room creation and communication mode change', () => {
      const validRoom = CreateRoomSchema.safeParse({
        name: 'Keynote Auditorium',
        maxCapacity: 100,
        activeMode: 'VIDEO',
      });
      expect(validRoom.success).toBe(true);

      const validMode = ChangeRoomModeSchema.safeParse({
        activeMode: 'CANVAS',
      });
      expect(validMode.success).toBe(true);
    });
  });

  describe('Storage & Ticket Schemas', () => {
    it('validates presigned URL request schema', () => {
      const validReq = PresignedUrlRequestSchema.safeParse({
        filename: 'architecture_diagram.png',
        contentType: 'image/png',
        fileSize: 1048576,
        category: 'attachments',
      });
      expect(validReq.success).toBe(true);
    });

    it('validates support ticket creation and updates', () => {
      const validTicket = CreateTicketSchema.safeParse({
        title: 'Video tile flickers on Safari iOS',
        description: 'Simulcast layer switching latency causes visible artifact.',
        priority: 'HIGH',
      });
      expect(validTicket.success).toBe(true);

      const validUpdate = UpdateTicketSchema.safeParse({
        status: 'RESOLVED',
        priority: 'URGENT',
      });
      expect(validUpdate.success).toBe(true);
    });
  });
});
