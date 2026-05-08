import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EventsService } from './events.service';
import {Prisma} from "generated/prisma/client";

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  async create(
    @Body() createEventDto: Prisma.EventCreateInput,
    @Param('companyId') companyId: string
  ) {
    return await this.eventsService.create(companyId, createEventDto);
  }

  @Get()
  async findAll(
    @Param('companyId') companyId: string
  ) {
    return await this.eventsService.findAll(companyId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.eventsService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateEventDto: Prisma.EventUpdateInput) {
    return await this.eventsService.update(id, updateEventDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.eventsService.remove(id);
  }
}
