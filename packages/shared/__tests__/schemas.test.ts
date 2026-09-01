import { describe, it, expect } from 'vitest';
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  CreateCommunitySchema,
  CreateChannelSchema,
  CreateRoomSchema,
} from '../src/index.js';

describe('Shared Zod Schemas Validation Suite', () => {
  describe('RegisterRequestSchema', () => {
    it('validates a valid registration input', () => {
      const valid = {
        email: 'dev@mivo.app',
        username: 'dev_user',
        displayName: 'Dev User',
        password: 'Password123!',
      };
      const result = RegisterRequestSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects invalid email addresses', () => {
      const invalid = {
        email: 'not-an-email',
        username: 'dev_user',
        displayName: 'Dev User',
        password: 'Password123!',
      };
      const result = RegisterRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects short passwords (< 8 chars)', () => {
      const invalid = {
        email: 'dev@mivo.app',
        username: 'dev_user',
        displayName: 'Dev User',
        password: '123',
      };
      const result = RegisterRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateCommunitySchema', () => {
    it('validates a valid community creation input', () => {
      const valid = {
        name: 'Design Collective',
        slug: 'design-collective',
        description: 'A community for designers',
        visibility: 'PUBLIC',
      };
      const result = CreateCommunitySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects uppercase or invalid characters in slug', () => {
      const invalid = {
        name: 'Design Collective',
        slug: 'Design Collective!',
      };
      const result = CreateCommunitySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateChannelSchema', () => {
    it('validates a valid channel creation input', () => {
      const valid = {
        name: 'voice-huddle',
        type: 'VOICE',
        isPrivate: false,
      };
      const result = CreateChannelSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('CreateRoomSchema', () => {
    it('validates room creation with dynamic mode', () => {
      const valid = {
        name: 'Daily Standup',
        activeMode: 'VIDEO',
        maxCapacity: 50,
      };
      const result = CreateRoomSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });
});
