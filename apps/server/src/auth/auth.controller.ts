import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  Get,
  HttpCode,
  HttpStatus,
  UsePipes,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service.js';
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  GuestLoginSchema,
  UpgradeGuestSchema,
  RegisterInput,
  LoginInput,
  GuestLoginInput,
  UpgradeGuestInput,
  ApiResponse,
  AuthSessionResponse,
  JwtPayload,
  GuestLimitsDTO,
} from '@mivo/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { JwtAuthGuard } from '../common/jwt-auth.guard.js';
import { CurrentUser } from '../common/current-user.decorator.js';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @UsePipes(new ZodValidationPipe(RegisterRequestSchema))
  async register(
    @Body() body: RegisterInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<ApiResponse<AuthSessionResponse>> {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;

    const { session, refreshToken } = await this.authService.register(body, userAgent, ipAddress);

    this.setRefreshTokenCookie(res, refreshToken);

    return {
      success: true,
      data: session,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(LoginRequestSchema))
  async login(
    @Body() body: LoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<ApiResponse<AuthSessionResponse>> {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;

    const { session, refreshToken } = await this.authService.login(body, userAgent, ipAddress);

    this.setRefreshTokenCookie(res, refreshToken);

    return {
      success: true,
      data: session,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<ApiResponse<{ accessToken: string }>> {
    const token = req.cookies?.refreshToken;
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;

    const { accessToken, newRefreshToken } = await this.authService.refreshToken(
      token,
      userAgent,
      ipAddress
    );

    this.setRefreshTokenCookie(res, newRefreshToken);

    return {
      success: true,
      data: { accessToken },
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<ApiResponse<{ message: string }>> {
    const token = req.cookies?.refreshToken;
    if (token) {
      await this.authService.logout(token);
    }
    res.clearCookie('refreshToken', { path: '/api/v1/auth' });

    return {
      success: true,
      data: { message: 'Logged out successfully' },
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: JwtPayload): Promise<ApiResponse<JwtPayload>> {
    return {
      success: true,
      data: user,
    };
  }

  @Post('guest')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(GuestLoginSchema))
  async guestLogin(
    @Body() body: GuestLoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<ApiResponse<AuthSessionResponse>> {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;

    const { session, refreshToken } = await this.authService.guestLogin(body, userAgent, ipAddress);

    this.setRefreshTokenCookie(res, refreshToken);

    return {
      success: true,
      data: session,
    };
  }

  @Post('upgrade')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(UpgradeGuestSchema))
  async upgradeGuest(
    @CurrentUser() user: JwtPayload,
    @Body() body: UpgradeGuestInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<ApiResponse<AuthSessionResponse>> {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;

    const { session, refreshToken } = await this.authService.upgradeGuest(
      user.sub,
      body,
      userAgent,
      ipAddress
    );

    this.setRefreshTokenCookie(res, refreshToken);

    return {
      success: true,
      data: session,
    };
  }

  @Get('limits')
  @UseGuards(JwtAuthGuard)
  async getLimits(@CurrentUser() user: JwtPayload): Promise<ApiResponse<GuestLimitsDTO>> {
    const limits = await this.authService.getGuestLimits(user.sub);
    return {
      success: true,
      data: limits,
    };
  }

  private setRefreshTokenCookie(res: Response, token: string) {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
