import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProjectsService } from './projects.service.js';
import { JwtAuthGuard } from '../common/jwt-auth.guard.js';
import { CurrentUser } from '../common/current-user.decorator.js';
import { JwtPayload, ApiResponse, ProjectDTO, CreateProjectInput } from '@mivo/shared';

@Controller('api/v1/projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Get()
  async listProjects(@Query('tag') tag?: string): Promise<ApiResponse<ProjectDTO[]>> {
    const data = await this.projectsService.listProjects(tag);
    return {
      success: true,
      data,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createProject(
    @CurrentUser() user: JwtPayload,
    @Body() body: CreateProjectInput
  ): Promise<ApiResponse<ProjectDTO>> {
    const project = await this.projectsService.createProject(user.sub, body);
    return {
      success: true,
      data: project,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteProject(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    await this.projectsService.deleteProject(user.sub, id);
    return {
      success: true,
      data: { deleted: true },
    };
  }
}
