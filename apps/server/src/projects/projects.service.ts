import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { prisma } from '@mivo/database';
import { CreateProjectInput, ProjectDTO } from '@mivo/shared';

@Injectable()
export class ProjectsService {
  async listProjects(tag?: string): Promise<ProjectDTO[]> {
    const where: any = {};
    if (tag) {
      where.tags = { has: tag.toLowerCase() };
    }

    const projects = await (prisma.project.findMany as any)({
      where,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return (projects as any[]).map((p: any) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      authorId: p.authorId,
      authorUsername: p.author?.username || 'Unknown',
      authorDisplayName: p.author?.displayName || 'Unknown',
      authorAvatarUrl: p.author?.avatarUrl || null,
      demoUrl: p.demoUrl,
      githubUrl: p.githubUrl,
      tags: p.tags,
      codeSnippet: p.codeSnippet,
      language: p.language || undefined,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  async createProject(userId: string, input: CreateProjectInput): Promise<ProjectDTO> {
    const user: any = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, displayName: true, avatarUrl: true, isGuest: true, userTier: true } as any,
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Author account not found',
      });
    }

    if (user.isGuest || user.userTier === 'GUEST') {
      throw new ForbiddenException({
        code: 'GUEST_RESTRICTION',
        message: 'Guest accounts cannot publish projects. Please claim a permanent developer account to showcase your work.',
      });
    }

    const cleanedTags = (input.tags || [])
      .map((t: string) => t.trim().toLowerCase())
      .filter(Boolean);

    const project: any = await (prisma.project.create as any)({
      data: {
        title: input.title.trim(),
        description: input.description.trim(),
        authorId: user.id,
        demoUrl: input.demoUrl?.trim() || null,
        githubUrl: input.githubUrl?.trim() || null,
        tags: cleanedTags,
        codeSnippet: input.codeSnippet || null,
        language: input.language?.trim() || 'typescript',
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return {
      id: project.id,
      title: project.title,
      description: project.description,
      authorId: project.authorId,
      authorUsername: project.author?.username || user.username || 'Unknown',
      authorDisplayName: project.author?.displayName || user.displayName || 'Unknown',
      authorAvatarUrl: project.author?.avatarUrl || user.avatarUrl || null,
      demoUrl: project.demoUrl,
      githubUrl: project.githubUrl,
      tags: project.tags,
      codeSnippet: project.codeSnippet,
      language: project.language || undefined,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }

  async deleteProject(userId: string, projectId: string): Promise<void> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException({
        code: 'PROJECT_NOT_FOUND',
        message: 'Project not found',
      });
    }

    if (project.authorId !== userId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You can only delete projects you published',
      });
    }

    await prisma.project.delete({
      where: { id: projectId },
    });
  }
}
