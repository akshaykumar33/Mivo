import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { prisma } from '@mivo/database';
import {
  RegisterInput,
  LoginInput,
  AuthSessionResponse,
  JwtPayload,
} from '@mivo/shared';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async register(input: RegisterInput, userAgent?: string, ipAddress?: string): Promise<{ session: AuthSessionResponse; refreshToken: string }> {
    // 1. Check for existing user by email or username
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: input.email.toLowerCase() }, { username: input.username.toLowerCase() }],
      },
    });

    if (existing) {
      if (existing.email.toLowerCase() === input.email.toLowerCase()) {
        throw new ConflictException({
          code: 'EMAIL_IN_USE',
          message: 'An account with this email already exists',
        });
      }
      throw new ConflictException({
        code: 'USERNAME_IN_USE',
        message: 'This username is already taken',
      });
    }

    // 2. Hash password with Argon2id
    const passwordHash = await argon2.hash(input.password);

    // 3. Create user in database
    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        username: input.username,
        displayName: input.displayName,
        passwordHash,
        status: 'ONLINE',
      },
    });

    // 4. Issue tokens
    return this.createSession(user, userAgent, ipAddress);
  }

  async login(input: LoginInput, userAgent?: string, ipAddress?: string): Promise<{ session: AuthSessionResponse; refreshToken: string }> {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    const isValidPassword = await argon2.verify(user.passwordHash, input.password);
    if (!isValidPassword) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    // Update status and lastSeenAt
    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'ONLINE', lastSeenAt: new Date() },
    });

    return this.createSession(user, userAgent, ipAddress);
  }

  async refreshToken(token: string, userAgent?: string, ipAddress?: string): Promise<{ accessToken: string; newRefreshToken: string }> {
    if (!token) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Refresh token is missing',
      });
    }

    const session = await prisma.session.findUnique({
      where: { refreshToken: token },
      include: { user: true },
    });

    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      if (session) {
        // Revoke expired session
        await prisma.session.update({ where: { id: session.id }, data: { isRevoked: true } });
      }
      throw new UnauthorizedException({
        code: 'SESSION_EXPIRED',
        message: 'Session has expired or has been revoked. Please log in again.',
      });
    }

    // Rotate refresh token
    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: newRefreshToken,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    const accessToken = this.generateAccessToken({
      sub: session.user.id,
      email: session.user.email,
      username: session.user.username,
    });

    return { accessToken, newRefreshToken };
  }

  async logout(token: string): Promise<void> {
    if (!token) return;
    await prisma.session.updateMany({
      where: { refreshToken: token },
      data: { isRevoked: true },
    });
  }

  private async createSession(user: any, userAgent?: string, ipAddress?: string) {
    const accessToken = this.generateAccessToken({
      sub: user.id,
      email: user.email,
      username: user.username,
    });

    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    return {
      session: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          bannerUrl: user.bannerUrl,
          bio: user.bio,
          customStatus: user.customStatus,
          status: user.status,
          createdAt: user.createdAt.toISOString(),
          lastSeenAt: user.lastSeenAt ? user.lastSeenAt.toISOString() : null,
        },
        accessToken,
      },
      refreshToken,
    };
  }

  private generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_super_secure_32chars_min',
      expiresIn: '15m',
    });
  }
}
