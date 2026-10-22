import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '@mivo/shared';
import { prisma } from '@mivo/database';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_super_secure_32chars_min',
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user: any = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        status: true,
        isGuest: true,
        userTier: true,
        deletedAt: true,
      } as any,
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'User account not found or deactivated',
      });
    }

    return {
      sub: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      isGuest: Boolean(user.isGuest),
      userTier: user.userTier || (user.isGuest ? 'GUEST' : 'NON_ORG'),
    };
  }
}
