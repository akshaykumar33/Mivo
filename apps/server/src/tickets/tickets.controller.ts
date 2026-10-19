import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { TicketsService } from './tickets.service.js';
import { JwtAuthGuard } from '../common/jwt-auth.guard.js';
import { CurrentUser } from '../common/current-user.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  CreateTicketSchema,
  CreateTicketInput,
  UpdateTicketSchema,
  UpdateTicketInput,
  ApiResponse,
  TicketDTO,
  JwtPayload,
} from '@mivo/shared';

@Controller('api/v1/tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

  @Get()
  async listTickets(
    @CurrentUser() user: JwtPayload,
    @Query('communityId') communityId?: string,
    @Query('status') status?: string
  ): Promise<ApiResponse<TicketDTO[]>> {
    const tickets = await this.ticketsService.listTickets(user.sub, communityId, status);
    return {
      success: true,
      data: tickets,
    };
  }

  @Post()
  @UsePipes(new ZodValidationPipe(CreateTicketSchema))
  async createTicket(
    @CurrentUser() user: JwtPayload,
    @Body() body: CreateTicketInput
  ): Promise<ApiResponse<TicketDTO>> {
    const ticket = await this.ticketsService.createTicket(user.sub, body);
    return {
      success: true,
      data: ticket,
    };
  }

  @Get(':id')
  async getTicket(@Param('id') id: string): Promise<ApiResponse<TicketDTO>> {
    const ticket = await this.ticketsService.getTicket(id);
    return {
      success: true,
      data: ticket,
    };
  }

  @Patch(':id')
  @UsePipes(new ZodValidationPipe(UpdateTicketSchema))
  async updateTicket(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: UpdateTicketInput
  ): Promise<ApiResponse<TicketDTO>> {
    const ticket = await this.ticketsService.updateTicket(id, user.sub, body);
    return {
      success: true,
      data: ticket,
    };
  }
}
