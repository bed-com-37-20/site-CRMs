import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { MinioService } from 'src/minio/minio.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class EventsService {
  private readonly bucketName = 'events';

  constructor(
    private readonly prisma: DatabaseService,
    private readonly minioService: MinioService,
  ) {}

  async create(
    companyId: string,
    createEventDto: Prisma.EventCreateInput,
  ) {
    return await this.prisma.event.create({
      data: {
        ...createEventDto,
        organiser: { connect: { id: companyId } },
      },
    });
  }

  async findAll(companyId: string) {
    console.log(this.prisma.event.findMany());
    return await this.prisma.event.findMany({
      where: { organiserId: companyId },
    });
  }

  async findOne(id: string) {
    return await this.prisma.event.findUnique({ where: { id: id } });
  }

  async update(id: string, updateEventDto: Prisma.EventUpdateInput) {
    return await this.prisma.event.update({
      where: { id: id },
      data: updateEventDto,
    });
  }

  async remove(id: string) {
    return await this.prisma.event.delete({ where: { id: id } });
  }

  /**
   * Upload an image for an event
   * @param eventId - Event ID
   * @param file - File object from Express
   */
  async uploadEventImage(eventId: string, file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file provided');
    }

    // Validate file is an image
    if (!file.mimetype.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Generate a unique filename
    const fileName = `${eventId}/${uuid()}-${file.originalname}`;

    // Upload to MinIO
    await this.minioService.uploadFile(
      this.bucketName,
      fileName,
      file.buffer,
      file.mimetype,
    );

    // Store just the file path (not presigned URL) to avoid signature expiration
    const imageUrl = fileName;

    // Update event with image URL
    return await this.prisma.event.update({
      where: { id: eventId },
      data: { imageUrl },
    });
  }

  /**
   * Delete an event image
   * @param eventId - Event ID
   */
  async deleteEventImage(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event || !event.imageUrl) {
      throw new Error('Event or image not found');
    }

    // Extract filename from path
    const fileName = event.imageUrl;

    // Delete from MinIO
    await this.minioService.deleteFile(this.bucketName, fileName);

    // Update event record
    return await this.prisma.event.update({
      where: { id: eventId },
      data: { imageUrl: null },
    });
  }

  /**
   * Get event image stream
   * @param eventId - Event ID
   */
  async getEventImageStream(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event || !event.imageUrl) {
      throw new Error('Event or image not found');
    }

    // Get file stream from MinIO
    return await this.minioService.getFileStream(
      this.bucketName,
      event.imageUrl,
    );
  }
}
