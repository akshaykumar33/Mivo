import { Controller, Get, Patch, Body, UseGuards, Param, Query } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../common/jwt-auth.guard.js';
import { CurrentUser } from '../common/current-user.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  UpdateProfileSchema,
  UpdateProfileInput,
  UpdateStatusSchema,
  UpdateStatusInput,
  ApiResponse,
  UserDTO,
  UserSummaryDTO,
  JwtPayload,
} from '@mivo/shared';

@Controller('api/v1/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  async searchUsers(
    @CurrentUser() user: JwtPayload,
    @Query('q') query?: string
  ): Promise<ApiResponse<UserSummaryDTO[]>> {
    const users = await this.usersService.searchUsers(query, user.sub);
    return {
      success: true,
      data: users,
    };
  }

  @Get('me')
  async getMyProfile(@CurrentUser() user: JwtPayload): Promise<ApiResponse<UserDTO>> {
    const profile = await this.usersService.getProfile(user.sub);
    return {
      success: true,
      data: profile,
    };
  }

  @Patch('me')
  async updateMyProfile(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(UpdateProfileSchema)) body: UpdateProfileInput
  ): Promise<ApiResponse<UserDTO>> {
    const updated = await this.usersService.updateProfile(user.sub, body);
    return {
      success: true,
      data: updated,
    };
  }

  @Patch('me/status')
  async updateMyStatus(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(UpdateStatusSchema)) body: UpdateStatusInput
  ): Promise<ApiResponse<UserDTO>> {
    const updated = await this.usersService.updateStatus(user.sub, body);
    return {
      success: true,
      data: updated,
    };
  }

  @Get(':id')
  async getUserProfile(@Param('id') id: string): Promise<ApiResponse<UserDTO>> {
    const profile = await this.usersService.getProfile(id);
    return {
      success: true,
      data: profile,
    };
  }
}
