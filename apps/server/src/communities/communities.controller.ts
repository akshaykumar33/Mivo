import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { CommunitiesService } from './communities.service.js';
import { JwtAuthGuard } from '../common/jwt-auth.guard.js';
import { CurrentUser } from '../common/current-user.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  CreateCommunitySchema,
  CreateCommunityInput,
  ApiResponse,
  CommunityDTO,
  CommunityDetailsDTO,
  CommunityMemberDTO,
  JwtPayload,
} from '@mivo/shared';

@Controller('api/v1/communities')
@UseGuards(JwtAuthGuard)
export class CommunitiesController {
  constructor(private communitiesService: CommunitiesService) {}

  @Get()
  async listMyCommunities(@CurrentUser() user: JwtPayload): Promise<ApiResponse<CommunityDTO[]>> {
    const communities = await this.communitiesService.listUserCommunities(user.sub);
    return {
      success: true,
      data: communities,
    };
  }

  @Post()
  @UsePipes(new ZodValidationPipe(CreateCommunitySchema))
  async createCommunity(
    @CurrentUser() user: JwtPayload,
    @Body() body: CreateCommunityInput
  ): Promise<ApiResponse<CommunityDTO>> {
    const community = await this.communitiesService.createCommunity(user.sub, body);
    return {
      success: true,
      data: community,
    };
  }

  @Get(':id')
  async getCommunityDetails(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string
  ): Promise<ApiResponse<CommunityDetailsDTO>> {
    const community = await this.communitiesService.getCommunityDetails(id, user.sub);
    return {
      success: true,
      data: community,
    };
  }

  @Post(':id/join')
  async joinCommunity(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string
  ): Promise<ApiResponse<CommunityMemberDTO>> {
    const member = await this.communitiesService.joinCommunity(id, user.sub);
    return {
      success: true,
      data: member,
    };
  }

  @Get(':id/members')
  async listMembers(@Param('id') id: string): Promise<ApiResponse<CommunityMemberDTO[]>> {
    const members = await this.communitiesService.listMembers(id);
    return {
      success: true,
      data: members,
    };
  }
}
