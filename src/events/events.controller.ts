// src/modules/events/events.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Response,
  NotFoundException,
  BadRequestException,
  HttpStatus,
  HttpCode,
  Query,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { Prisma } from 'generated/prisma/client';
import { AuthGuard } from 'src/app/guards/authGuard';
import { Response as ExpressResponse } from 'express';
import { fileUploadConfig } from '../../file-upload.config';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Create a new event' })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  @ApiQuery({ name: 'companyId', required: true, type: String })
  async create(
    @Body() createEventDto: Prisma.EventCreateInput,
    @Query('companyId') companyId: string,
  ) {
    if (!companyId) {
      throw new BadRequestException('Company ID is required');
    }
    return await this.eventsService.create(companyId, createEventDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all events' })
  async findAll() {
    return await this.eventsService.findAll();
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming events' })
  async getUpcomingEvents() {
    return await this.eventsService.getUpcomingEvents();
  }

  @Get('past')
  @ApiOperation({ summary: 'Get past events' })
  async getPastEvents() {
    return await this.eventsService.getPastEvents();
  }

  @Get('category/:category')
  @ApiOperation({ summary: 'Get events by category' })
  async findByCategory(@Param('category') category: string) {
    return await this.eventsService.findByCategory(category);
  }

  @Get('company/:companyId')
  @ApiOperation({ summary: 'Get events by company' })
  async findByCompany(@Param('companyId') companyId: string) {
    return await this.eventsService.findByCompany(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event by ID' })
  async findOne(@Param('id') id: string) {
    return await this.eventsService.findOne(id);
  }

  @Get(':id/image')
  @ApiOperation({ summary: 'Get event image' })
  async getEventImage(@Param('id') id: string, @Response() res) {
    try {
      const stream = await this.eventsService.getEventImageStream(id);
      res.set({
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      });
      stream.pipe(res);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Event image not found');
    }
  }

  @Get(':id/image-url')
  @ApiOperation({ summary: 'Get event image URL' })
  async getEventImageUrl(@Param('id') id: string) {
    const url = await this.eventsService.getEventImageUrl(id);
    return { url };
  }

  @Get(':id/files')
  @ApiOperation({ summary: 'Get all files for an event' })
  async getAllFiles(@Param('id') id: string) {
    return await this.eventsService.getAllEventFiles(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update event' })
  async update(
    @Param('id') id: string,
    @Body() updateEventDto: Prisma.EventUpdateInput,
  ) {
    return await this.eventsService.update(id, updateEventDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete event' })
  async remove(@Param('id') id: string) {
    await this.eventsService.remove(id);
  }

  @Post(':id/upload-image')
  @UseInterceptors(FileInterceptor('file', fileUploadConfig))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload event image' })
  async uploadEventImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return await this.eventsService.uploadEventImage(id, file);
  }

  @Post(':id/update-image')
  @UseInterceptors(FileInterceptor('file', fileUploadConfig))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Update event image' })
  async updateEventImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return await this.eventsService.updateEventImage(id, file);
  }

  @Post(':id/upload-multiple-images')
  @UseInterceptors(FilesInterceptor('files', 10, fileUploadConfig))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload multiple event images (gallery)' })
  async uploadMultipleEventImages(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }
    return await this.eventsService.uploadMultipleEventImages(id, files);
  }

  @Post(':id/upload-file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        fieldName: {
          type: 'string',
          description: 'Optional field name for the file',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a generic file for event' })
  async uploadFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('fieldName') fieldName?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return await this.eventsService.uploadEventFile(id, file, fieldName);
  }

  @Delete(':id/image')
  @ApiOperation({ summary: 'Delete event image' })
  async deleteEventImage(@Param('id') id: string) {
    return await this.eventsService.deleteEventImage(id);
  }

  @Delete(':id/files/:fieldName')
  @ApiOperation({ summary: 'Delete a specific file by field name' })
  async deleteFileByField(
    @Param('id') id: string,
    @Param('fieldName') fieldName: string,
  ) {
    return await this.eventsService.deleteEventFileByField(id, fieldName);
  }
}