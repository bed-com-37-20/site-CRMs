import { Controller, Get, Post, Body, Patch, Query, Delete, Param, UseGuards,Request } from '@nestjs/common';
import { EventsService } from './events.service';
import {Prisma} from "generated/prisma/client";
import { AuthGuard } from 'src/app/guards/authGuard';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  async create(
    @Body() createEventDto: Prisma.EventCreateInput,
    @Query('id') companyId: string
  ) {
    return await this.eventsService.create(companyId, createEventDto);
  }

  @Get()
  @UseGuards(AuthGuard)
  async findAll(
    @Request() req,
    @Query('id') companyId: string
  ) {
    console.log(companyId)
    return await this.eventsService.findAll(companyId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
     console.log(id)
    return await this.eventsService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateEventDto: Prisma.EventUpdateInput) {
    return await this.eventsService.update(id, updateEventDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    console.log(id)
    return await this.eventsService.remove(id);
  }
}
