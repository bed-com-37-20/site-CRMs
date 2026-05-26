// src/modules/events/events.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { FilesService } from '../files/files.service';
import { EntityType } from '../files/dto/file.dto';
import { ReadStream } from 'fs';
import { CompanyService } from '../company/company.service';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly prisma: DatabaseService,
    private readonly fileService: FilesService,
    private readonly companyService: CompanyService,
  ) {}

  async create(
    companyId: string,
    createEventDto: Prisma.EventCreateInput,
  ) {
    // Verify company exists
    const company = await this.companyService.findOne(companyId);
    if (!company) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }

    return await this.prisma.event.create({
      data: {
        ...createEventDto,
        organiser: { connect: { id: companyId } },
      },
    });
  }

  async findAll() {
    return await this.prisma.event.findMany({
      include: {
        organiser: true,
      },
      orderBy: {
        date: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({ 
      where: { id },
      include: {
        organiser: true,
      },
    });
    
    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }
    
    return event;
  }

  async update(id: string, updateEventDto: Prisma.EventUpdateInput) {
    // Check if event exists
    await this.findOne(id);
    
    return await this.prisma.event.update({
      where: { id },
      data: updateEventDto,
    });
  }

  async remove(id: string) {
    // Check if event exists
    const event = await this.findOne(id);
    
    // First delete associated image if exists
    await this.fileService.deleteEntityFiles(EntityType.EVENT, id);
    
    // Then delete the event
    return await this.prisma.event.delete({ where: { id } });
  }

  /**
   * Get events by company
   */
  async findByCompany(companyId: string) {
    const events = await this.prisma.event.findMany({
      where: { organiserId: companyId },
      include: {
        organiser: true,
      },
      orderBy: {
        date: 'asc',
      },
    });
    
    return events;
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents() {
    const now = new Date();
    return await this.prisma.event.findMany({
      where: {
        date: {
          gte: now,
        },
      },
      include: {
        organiser: true,
      },
      orderBy: {
        date: 'asc',
      },
    });
  }

  /**
   * Get past events
   */
  async getPastEvents() {
    const now = new Date();
    return await this.prisma.event.findMany({
      where: {
        date: {
          lt: now,
        },
      },
      include: {
        organiser: true,
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  /**
   * Get events by category
   */
  async findByCategory(category: string) {
    return await this.prisma.event.findMany({
      where: { category },
      include: {
        organiser: true,
      },
      orderBy: {
        date: 'asc',
      },
    });
  }

  /**
   * Upload an image for an event using FileService
   */
  async uploadEventImage(eventId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file is an image
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }

    // Check if event exists
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    try {
      // Upload file using FileService
      const uploadedFile = await this.fileService.uploadFile(file, {
        entityType: EntityType.EVENT,
        entityId: eventId,
        fieldName: 'imageUrl',
      });

      this.logger.log(`Event image uploaded successfully for event ${eventId}`);
      
      return {
        message: 'Event image uploaded successfully',
        file: uploadedFile,
        event: await this.prisma.event.findUnique({
          where: { id: eventId },
          include: {
            organiser: true,
          },
        }),
      };
    } catch (error) {
      this.logger.error(`Failed to upload event image: ${error}`);
      throw new BadRequestException(`Failed to upload event image: ${error}`);
    }
  }

  /**
   * Update event image (replace existing)
   */
  async updateEventImage(eventId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file is an image
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }

    // Check if event exists
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    // Find existing event image
    const existingFile = await this.fileService.getFileByField(
      EntityType.EVENT,
      eventId,
      'imageUrl',
    );

    try {
      let uploadedFile;
      
      if (existingFile) {
        // Update existing image
        uploadedFile = await this.fileService.updateFile(existingFile.id, {}, file);
        this.logger.log(`Event image updated successfully for event ${eventId}`);
      } else {
        // Upload new image
        uploadedFile = await this.fileService.uploadFile(file, {
          entityType: EntityType.EVENT,
          entityId: eventId,
          fieldName: 'imageUrl',
        });
        this.logger.log(`Event image uploaded successfully for event ${eventId}`);
      }

      return {
        message: existingFile ? 'Event image updated successfully' : 'Event image uploaded successfully',
        file: uploadedFile,
        event: await this.prisma.event.findUnique({
          where: { id: eventId },
          include: {
            organiser: true,
          },
        }),
      };
    } catch (error) {
      this.logger.error(`Failed to update event image: ${error}`);
      throw new BadRequestException(`Failed to update event image: ${error}`);
    }
  }

  /**
   * Delete event image
   */
  async deleteEventImage(eventId: string) {
    // Check if event exists
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    // Find the event image file
    const eventImage = await this.fileService.getFileByField(
      EntityType.EVENT,
      eventId,
      'imageUrl',
    );

    if (!eventImage) {
      throw new NotFoundException('Event image not found for this event');
    }

    try {
      // Delete the file
      await this.fileService.deleteFile(eventImage.id);
      
      this.logger.log(`Event image deleted successfully for event ${eventId}`);
      
      return {
        message: 'Event image deleted successfully',
        event: await this.prisma.event.findUnique({
          where: { id: eventId },
          include: {
            organiser: true,
          },
        }),
      };
    } catch (error) {
      this.logger.error(`Failed to delete event image: ${error}`);
      throw new BadRequestException(`Failed to delete event image: ${error}`);
    }
  }

  /**
   * Get event image stream
   */
  async getEventImageStream(eventId: string): Promise<ReadStream> {
    // Check if event exists
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    // Find the event image file
    const eventImage = await this.fileService.getFileByField(
      EntityType.EVENT,
      eventId,
      'imageUrl',
    );

    if (!eventImage) {
      throw new NotFoundException('Event image not found for this event');
    }

    try {
      // Get file stream
      const { stream } = await this.fileService.getFileStream(eventImage.id);
      return stream;
    } catch (error) {
      this.logger.error(`Failed to get event image stream: ${error}`);
      throw new NotFoundException('Failed to retrieve event image');
    }
  }

  /**
   * Get event image URL (if you need direct URL access)
   */
  async getEventImageUrl(eventId: string): Promise<string | null> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    const eventImage = await this.fileService.getFileByField(
      EntityType.EVENT,
      eventId,
      'imageUrl',
    );

    return eventImage ? eventImage.url : null;
  }

  /**
   * Get all files for an event
   */
  async getAllEventFiles(eventId: string) {
    // Check if event exists
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    return await this.fileService.getFilesByEntity(EntityType.EVENT, eventId);
  }

  /**
   * Upload a generic file for an event (e.g., brochures, documents)
   */
  async uploadEventFile(eventId: string, file: Express.Multer.File, fieldName: string = 'attachment') {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Check if event exists
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    try {
      // Upload file using FileService
      const uploadedFile = await this.fileService.uploadFile(file, {
        entityType: EntityType.EVENT,
        entityId: eventId,
        fieldName: fieldName,
      });

      this.logger.log(`File uploaded successfully for event ${eventId}`);
      
      return {
        message: 'File uploaded successfully',
        file: uploadedFile,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error}`);
      throw new BadRequestException(`Failed to upload file: ${error}`);
    }
  }

  /**
   * Delete a specific file by field name
   */
  async deleteEventFileByField(eventId: string, fieldName: string) {
    // Check if event exists
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    const file = await this.fileService.getFileByField(
      EntityType.EVENT,
      eventId,
      fieldName,
    );

    if (!file) {
      throw new NotFoundException(`File for field '${fieldName}' not found`);
    }

    try {
      await this.fileService.deleteFile(file.id);
      
      this.logger.log(`File ${fieldName} deleted successfully for event ${eventId}`);
      
      return {
        message: `File '${fieldName}' deleted successfully`,
      };
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error}`);
      throw new BadRequestException(`Failed to delete file: ${error}`);
    }
  }

  /**
   * Upload multiple event images (e.g., gallery)
   */
  async uploadMultipleEventImages(eventId: string, files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    // Check if event exists
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    const uploadedFiles = [] as any;
    const errors = [] as any;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        if (!file.mimetype.startsWith('image/')) {
          throw new Error(`File ${file.originalname} is not an image`);
        }

        const uploadedFile = await this.fileService.uploadFile(file, {
          entityType: EntityType.EVENT,
          entityId: eventId,
          fieldName: `gallery_${i + 1}`,
        });

        uploadedFiles.push(uploadedFile);
      } catch (error) {
        errors.push({ file: file.originalname, error: error });
      }
    }

    this.logger.log(`Uploaded ${uploadedFiles.length} images for event ${eventId}`);

    return {
      message: `${uploadedFiles.length} files uploaded successfully`,
      uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}