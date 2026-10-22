import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { prisma } from '@mivo/database';
import {
  RegisterInput,
  LoginInput,
  GuestLoginInput,
  UpgradeGuestInput,
  AuthSessionResponse,
  JwtPayload,
  GuestLimitsDTO,
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

  async guestLogin(
    input: GuestLoginInput,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ session: AuthSessionResponse; refreshToken: string }> {
    const guestSuffix = crypto.randomBytes(3).toString('hex');
    const username = `guest_${guestSuffix}`;
    const displayName = input.displayName?.trim() || `Guest ${guestSuffix.toUpperCase()}`;
    const email = `${username}@guest.mivo.local`;
    const passwordHash = await argon2.hash(crypto.randomBytes(16).toString('hex'));

    const user = await prisma.user.create({
      data: {
        email,
        username,
        displayName,
        passwordHash,
        avatarUrl: input.avatarUrl || null,
        status: 'ONLINE',
        isGuest: true,
      } as any,
    });

    // Automatically join the default community with GUEST role if a community exists
    try {
      const publicCommunity = await prisma.community.findFirst({
        where: { deletedAt: null },
        include: {
          roles: {
            where: { name: 'Guest' },
          },
        },
      });

      if (publicCommunity) {
        const guestRole =
          publicCommunity.roles[0] ||
          (await prisma.role.findFirst({
            where: { communityId: publicCommunity.id, name: 'Guest' },
          }));

        if (guestRole) {
          await prisma.communityMember.create({
            data: {
              communityId: publicCommunity.id,
              userId: user.id,
              roleId: guestRole.id,
            },
          });
        }
      }
    } catch {
      // Ignore if community join fails
    }

    return this.createSession(user, userAgent, ipAddress);
  }

  async upgradeGuest(
    userId: string,
    input: UpgradeGuestInput,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ session: AuthSessionResponse; refreshToken: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User account not found',
      });
    }

    if (!user.isGuest) {
      throw new BadRequestException({
        code: 'NOT_A_GUEST',
        message: 'This account is already a full permanent account',
      });
    }

    // Check if new email is in use
    const emailConflict = await prisma.user.findFirst({
      where: {
        email: input.email.toLowerCase(),
        id: { not: userId },
      },
    });

    if (emailConflict) {
      throw new ConflictException({
        code: 'EMAIL_IN_USE',
        message: 'An account with this email already exists',
      });
    }

    // If new username provided, check for conflict
    if (input.username) {
      const usernameConflict = await prisma.user.findFirst({
        where: {
          username: input.username.toLowerCase(),
          id: { not: userId },
        },
      });
      if (usernameConflict) {
        throw new ConflictException({
          code: 'USERNAME_IN_USE',
          message: 'This username is already taken',
        });
      }
    }

    const passwordHash = await argon2.hash(input.password);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        username: input.username ? input.username.toLowerCase() : user.username,
        displayName: input.displayName || user.displayName,
        isGuest: false,
      } as any,
    });

    // Upgrade community membership role from Guest to Member if applicable
    try {
      const membership = await prisma.communityMember.findFirst({
        where: { userId },
        include: { community: { include: { roles: true } } },
      });
      if (membership) {
        const memberRole = membership.community.roles.find((r) => r.name === 'Member' || r.isDefault);
        if (memberRole) {
          await prisma.communityMember.update({
            where: { id: membership.id },
            data: { roleId: memberRole.id },
          });
        }
      }
    } catch {
      // Non-critical
    }

    return this.createSession(updatedUser, userAgent, ipAddress);
  }

  async getGuestLimits(userId: string): Promise<GuestLimitsDTO> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isGuest: true, createdAt: true },
    });

    const isGuest = Boolean(user?.isGuest);
    const expiresAt = user?.createdAt
      ? new Date(user.createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    return {
      isGuest,
      maxUploadSizeBytes: isGuest ? 2 * 1024 * 1024 : 100 * 1024 * 1024,
      messageCooldownMs: isGuest ? 3000 : 0,
      canCreateCommunity: !isGuest,
      canManageRoles: !isGuest,
      canCreateChannels: !isGuest,
      sessionExpiresAt: isGuest ? expiresAt : undefined,
    };
  }

  private async createSession(user: any, userAgent?: string, ipAddress?: string) {
    const accessToken = this.generateAccessToken({
      sub: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      isGuest: Boolean(user.isGuest),
    });

    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + (user.isGuest ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000));

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
          isGuest: Boolean(user.isGuest),
          createdAt: user.createdAt.toISOString(),
          lastSeenAt: user.lastSeenAt ? user.lastSeenAt.toISOString() : null,
        },
        accessToken,
        isGuest: Boolean(user.isGuest),
      },
      refreshToken,
    };
  }

  private generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_super_secure_32chars_min',
      expiresIn: payload.isGuest ? '4h' : '15m',
    });
  }
}
