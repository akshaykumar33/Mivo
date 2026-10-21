import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
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
  AddCommunityMemberSchema,
  AddCommunityMemberInput,
  EligibleUserDTO,
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

  @Post(':id/members')
  @UsePipes(new ZodValidationPipe(AddCommunityMemberSchema))
  async addMember(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: AddCommunityMemberInput,
  ): Promise<ApiResponse<CommunityMemberDTO>> {
    const member = await this.communitiesService.addMember(id, user.sub, body);
    return {
      success: true,
      data: member,
    };
  }

  @Delete(':id/members/:userId')
  async removeMember(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    const result = await this.communitiesService.removeMember(id, user.sub, targetUserId);
    return {
      success: true,
      data: result,
    };
  }

  @Get(':id/eligible-users')
  async listEligibleUsers(
    @Param('id') id: string,
    @Query('q') query?: string,
  ): Promise<ApiResponse<EligibleUserDTO[]>> {
    const users = await this.communitiesService.listEligibleUsers(id, query);
    return {
      success: true,
      data: users,
    };
  }
}

