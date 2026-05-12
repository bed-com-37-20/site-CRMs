import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Query,
  Delete,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Response,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EventsService } from './events.service';
import { Prisma } from 'generated/prisma/client';
import { AuthGuard } from 'src/app/guards/authGuard';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  async create(
    @Body() createEventDto: Prisma.EventCreateInput,
    @Query('id') companyId: string,
  ) {
    return await this.eventsService.create(companyId, createEventDto);
  }

  @Get()
  @UseGuards(AuthGuard)
  async findAll(@Request() req, @Query('id') companyId: string) {
    console.log(companyId);
    return await this.eventsService.findAll(companyId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    console.log(id);
    return await this.eventsService.findOne(id);
  }

  @Get(':id/image')
  async getEventImage(@Param('id') id: string, @Response() res) {
    try {
      const stream = await this.eventsService.getEventImageStream(id);
      res.set({
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      });
      stream.pipe(res);
    } catch (error) {
      throw new NotFoundException('Event image not found');
    }
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateEventDto: Prisma.EventUpdateInput,
  ) {
    return await this.eventsService.update(id, updateEventDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    console.log(id);
    return await this.eventsService.remove(id);
  }

  @Post(':id/upload-image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadEventImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.eventsService.uploadEventImage(id, file);
  }

  @Delete(':id/image-delete')
  async deleteEventImage(@Param('id') id: string) {
    return await this.eventsService.deleteEventImage(id);
  }
}
