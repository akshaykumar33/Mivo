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
  UserTier,
  TierCapabilitiesDTO,
  getTierCapabilities,
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
        userTier: 'GUEST',
      } as any,
    });

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
        userTier: 'NON_ORG',
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

  async resolveUserTier(user: any): Promise<{
    userTier: UserTier;
    organizationId?: string | null;
    organizationName?: string | null;
    organizationRole?: string | null;
    organizationHierarchyLevel?: number | null;
  }> {
    if (!user || user.isGuest || user.userTier === 'GUEST') {
      return {
        userTier: 'GUEST',
        organizationId: null,
        organizationName: null,
        organizationRole: null,
        organizationHierarchyLevel: null,
      };
    }

    const membership = await prisma.communityMember.findFirst({
      where: { userId: user.id },
      include: {
        community: { select: { id: true, name: true, slug: true } },
        role: { select: { id: true, name: true, position: true } },
      },
    });

    if (membership) {
      let level = 4;
      const roleName = membership.role?.name?.toLowerCase() || '';
      if (roleName.includes('owner')) level = 1;
      else if (roleName.includes('admin')) level = 2;
      else if (roleName.includes('manager') || roleName.includes('lead')) level = 3;
      else if (roleName.includes('guest')) level = 5;

      return {
        userTier: 'ORG',
        organizationId: membership.community.id,
        organizationName: membership.community.name,
        organizationRole: membership.role?.name || 'Member',
        organizationHierarchyLevel: level,
      };
    }

    return {
      userTier: (user.userTier as UserTier) || 'NON_ORG',
      organizationId: null,
      organizationName: null,
      organizationRole: null,
      organizationHierarchyLevel: null,
    };
  }

  async getGuestLimits(userId: string): Promise<GuestLimitsDTO> {
    const user: any = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isGuest: true, userTier: true, createdAt: true } as any,
    });

    const tierInfo = await this.resolveUserTier(user);
    const caps = getTierCapabilities(tierInfo.userTier);
    const createdAt = user?.createdAt ? new Date(user.createdAt).getTime() : Date.now();
    const expiresAt = new Date(createdAt + 24 * 60 * 60 * 1000).toISOString();

    return {
      isGuest: tierInfo.userTier === 'GUEST',
      maxUploadSizeBytes: caps.maxUploadSizeBytes || 100 * 1024 * 1024,
      messageCooldownMs: tierInfo.userTier === 'GUEST' ? 999999 : 0,
      canCreateCommunity: caps.canBuildCommunities,
      canManageRoles: caps.hasOrgHierarchy,
      canCreateChannels: caps.canBuildCommunities,
      sessionExpiresAt: tierInfo.userTier === 'GUEST' ? expiresAt : undefined,
    };
  }

  private async createSession(user: any, userAgent?: string, ipAddress?: string) {
    const tierInfo = await this.resolveUserTier(user);

    const accessToken = this.generateAccessToken({
      sub: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      isGuest: Boolean(user.isGuest || tierInfo.userTier === 'GUEST'),
      userTier: tierInfo.userTier,
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
          isGuest: Boolean(user.isGuest || tierInfo.userTier === 'GUEST'),
          userTier: tierInfo.userTier,
          organizationId: tierInfo.organizationId,
          organizationName: tierInfo.organizationName,
          organizationRole: tierInfo.organizationRole,
          organizationHierarchyLevel: tierInfo.organizationHierarchyLevel,
          createdAt: user.createdAt.toISOString(),
          lastSeenAt: user.lastSeenAt ? user.lastSeenAt.toISOString() : null,
        },
        accessToken,
        isGuest: Boolean(user.isGuest || tierInfo.userTier === 'GUEST'),
        capabilities: getTierCapabilities(tierInfo.userTier),
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
