// src/modules/file/file.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { File as PrismaFile } from 'generated/prisma/client';
import { UploadFileDto, UpdateFileDto, EntityType } from './dto/file.dto';
import * as fs from 'fs-extra';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  constructor(private readonly prisma: DatabaseService) {
    this.initializeStorage();
  }

  /**
   * Initialize storage directories
   */
  private async initializeStorage() {
    try {
      await fs.ensureDir(this.uploadDir);
      this.logger.log(`Upload directory initialized at: ${this.uploadDir}`);
    } catch (error) {
      this.logger.error(`Failed to create upload directory: ${error}`);
      throw new BadRequestException('Failed to initialize storage system');
    }
  }

  /**
   * Generate unique file path for storage
   */
  private generateFilePath(originalName: string, entityType: string, entityId: string): string {
    const extension = path.extname(originalName);
    const fileName = `${uuidv4()}${extension}`;
    const entityFolder = path.join(this.uploadDir, entityType.toLowerCase());
    return path.join(entityFolder, fileName);
  }

  /**
   * Get public URL for a file
   */
  private getPublicUrl(filePath: string): string {
    const relativePath = path.relative(process.cwd(), filePath);
    return `/${relativePath.replace(/\\/g, '/')}`;
  }

  /**
   * Validate if the entity exists in the database
   */
  private async validateEntityExists(entityType: EntityType, entityId: string): Promise<void> {
    let exists = false;

    switch (entityType) {
      case EntityType.USER:
        const user = await this.prisma.user.findUnique({ where: { id: entityId } });
        exists = !!user;
        break;
      case EntityType.PRODUCT:
        const product = await this.prisma.product.findUnique({ where: { id: entityId } });
        exists = !!product;
        break;
      case EntityType.COMPANY_INFO:
        const companyInfo = await this.prisma.companyInfo.findUnique({ where: { id: entityId } });
        exists = !!companyInfo;
        break;
      case EntityType.EVENT:
        const event = await this.prisma.event.findUnique({ where: { id: entityId } });
        exists = !!event;
        break;
      case EntityType.APPLICATION:
        const application = await this.prisma.application.findUnique({ where: { id: entityId } });
        exists = !!application;
        break;
      default:
        throw new BadRequestException(`Invalid entity type: ${entityType}`);
    }

    if (!exists) {
      throw new NotFoundException(`${entityType} with ID ${entityId} not found`);
    }
  }

  /**
   * Update the entity's file reference field
   */
  private async updateEntityFileReference(
    entityType: EntityType,
    entityId: string,
    fieldName: string,
    fileUrl: string,
  ): Promise<void> {
    const updateData: any = { [fieldName]: fileUrl };

    switch (entityType) {
      case EntityType.USER:
        await this.prisma.user.update({
          where: { id: entityId },
          data: updateData,
        });
        break;
      case EntityType.PRODUCT:
        await this.prisma.product.update({
          where: { id: entityId },
          data: updateData,
        });
        break;
      case EntityType.COMPANY_INFO:
        await this.prisma.companyInfo.update({
          where: { id: entityId },
          data: updateData,
        });
        break;
      case EntityType.EVENT:
        await this.prisma.event.update({
          where: { id: entityId },
          data: updateData,
        });
        break;
      case EntityType.APPLICATION:
        await this.prisma.application.update({
          where: { id: entityId },
          data: updateData,
        });
        break;
    }
  }

  /**
   * Clear the entity's file reference field
   */
  private async clearEntityFileReference(
    entityType: EntityType,
    entityId: string,
    fieldName: string,
  ): Promise<void> {
    const updateData: any = { [fieldName]: null };

    switch (entityType) {
      case EntityType.USER:
        await this.prisma.user.update({
          where: { id: entityId },
          data: updateData,
        });
        break;
      case EntityType.PRODUCT:
        await this.prisma.product.update({
          where: { id: entityId },
          data: updateData,
        });
        break;
      case EntityType.COMPANY_INFO:
        await this.prisma.companyInfo.update({
          where: { id: entityId },
          data: updateData,
        });
        break;
      case EntityType.EVENT:
        await this.prisma.event.update({
          where: { id: entityId },
          data: updateData,
        });
        break;
      case EntityType.APPLICATION:
        await this.prisma.application.update({
          where: { id: entityId },
          data: updateData,
        });
        break;
    }
  }

  /**
   * Upload a new file and associate it with an entity
   */
  async uploadFile(
    file: Express.Multer.File,
    uploadFileDto: UploadFileDto,
  ): Promise<PrismaFile> {
    const { entityType, entityId, fieldName } = uploadFileDto;

    // Validate file exists
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate entity exists
    await this.validateEntityExists(entityType as EntityType, entityId);

    // Create entity-specific folder
    const entityFolder = path.join(this.uploadDir, entityType.toLowerCase());
    await fs.ensureDir(entityFolder);

    // Generate file path and save file
    const filePath = this.generateFilePath(file.originalname, entityType, entityId);
    const publicUrl = this.getPublicUrl(filePath);

    try {
      // Save file to disk
      await fs.writeFile(filePath, file.buffer);

      // Save file record in database
      const savedFile = await this.prisma.file.upsert({
        where: {
          entityType_entityId_fieldName: {
            entityType,
            entityId,
            fieldName,
          },
        },
        update: {
          filename: path.basename(filePath),
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          path: filePath,
          url: publicUrl,
        },
        create: {
          filename: path.basename(filePath),
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          path: filePath,
          url: publicUrl,
          entityType,
          entityId,
          fieldName,
        },
      });

      // Update the corresponding entity with the file URL
      await this.updateEntityFileReference(
        entityType as EntityType,
        entityId,
        fieldName,
        publicUrl,
      );

      this.logger.log(`File uploaded successfully: ${savedFile.id} for ${entityType}:${entityId}`);
      return savedFile;
    } catch (error) {
      // Clean up file if database operation fails
      await fs.remove(filePath).catch(() => {});
      this.logger.error(`Failed to upload file: ${error}`);
      throw new BadRequestException(`Failed to upload file: ${error}`);
    }
  }

  /**
   * Get all files associated with an entity
   */
  async getFilesByEntity(entityType: string, entityId: string): Promise<PrismaFile[]> {
    const files = await this.prisma.file.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return files;
  }

  /**
   * Get file by entity and field name
   */
  async getFileByField(
    entityType: string,
    entityId: string,
    fieldName: string,
  ): Promise<PrismaFile | null> {
    const file = await this.prisma.file.findUnique({
      where: {
        entityType_entityId_fieldName: {
          entityType,
          entityId,
          fieldName,
        },
      },
    });

    return file;
  }

  /**
   * Get a single file by ID
   */
  async getFileById(fileId: string): Promise<PrismaFile> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    return file;
  }

  /**
   * Update an existing file (replace or update metadata)
   */
  async updateFile(
    fileId: string,
    updateFileDto: UpdateFileDto,
    newFile?: Express.Multer.File,
  ): Promise<PrismaFile> {
    const existingFile = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!existingFile) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    // Handle file replacement if new file provided
    if (newFile) {
      // Delete old file from disk
      await fs.remove(existingFile.path).catch((error) => {
        this.logger.error(`Failed to delete old file: ${error.message}`);
      });

      // Generate new file path and save
      const newFilePath = this.generateFilePath(
        newFile.originalname,
        existingFile.entityType,
        existingFile.entityId,
      );
      await fs.writeFile(newFilePath, newFile.buffer);
      const newPublicUrl = this.getPublicUrl(newFilePath);

      // Update database with new file info
      const updatedFile = await this.prisma.file.update({
        where: { id: fileId },
        data: {
          filename: path.basename(newFilePath),
          originalName: newFile.originalname,
          mimeType: newFile.mimetype,
          size: newFile.size,
          path: newFilePath,
          url: newPublicUrl,
          ...(updateFileDto.filename && { filename: updateFileDto.filename }),
          ...(updateFileDto.originalName && { originalName: updateFileDto.originalName }),
        },
      });

      // Update entity reference with new URL
      await this.updateEntityFileReference(
        existingFile.entityType as EntityType,
        existingFile.entityId,
        existingFile.fieldName,
        newPublicUrl,
      );

      this.logger.log(`File updated successfully: ${updatedFile.id}`);
      return updatedFile;
    }

    // Just update metadata
    const updatedFile = await this.prisma.file.update({
      where: { id: fileId },
      data: {
        ...(updateFileDto.filename && { filename: updateFileDto.filename }),
        ...(updateFileDto.originalName && { originalName: updateFileDto.originalName }),
      },
    });

    this.logger.log(`File metadata updated: ${updatedFile.id}`);
    return updatedFile;
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string): Promise<void> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    // Delete physical file from disk
    await fs.remove(file.path).catch((error) => {
      this.logger.error(`Failed to delete file from disk: ${error.message}`);
    });

    // Delete database record
    await this.prisma.file.delete({
      where: { id: fileId },
    });

    // Clear entity field reference
    await this.clearEntityFileReference(
      file.entityType as EntityType,
      file.entityId,
      file.fieldName,
    );

    this.logger.log(`File deleted successfully: ${fileId}`);
  }

  /**
   * Get file stream for download/viewing
   */
  async getFileStream(fileId: string): Promise<{ stream: fs.ReadStream; file: PrismaFile }> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    // Check if file exists on disk
    const fileExists = await fs.pathExists(file.path);
    if (!fileExists) {
      throw new NotFoundException(`File not found on storage: ${file.filename}`);
    }

    const stream = fs.createReadStream(file.path);
    return { stream, file };
  }

  /**
   * Bulk delete files for an entity
   */
  async deleteEntityFiles(entityType: string, entityId: string): Promise<void> {
    const files = await this.prisma.file.findMany({
      where: {
        entityType,
        entityId,
      },
    });

    // Delete all physical files
    for (const file of files) {
      await fs.remove(file.path).catch((error) => {
        this.logger.error(`Failed to delete file ${file.id}: ${error.message}`);
      });
    }

    // Delete all database records
    await this.prisma.file.deleteMany({
      where: {
        entityType,
        entityId,
      },
    });

    this.logger.log(`Deleted ${files.length} files for ${entityType}:${entityId}`);
  }

  /**
   * Get file statistics
   */
  async getFileStats(fileId: string): Promise<{
    size: number;
    createdAt: Date;
    updatedAt: Date;
    diskSize?: number;
  }> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    let diskSize;
    try {
      const stats = await fs.stat(file.path);
      diskSize = stats.size;
    } catch (error) {
      this.logger.warn(`Could not get disk stats for file: ${fileId}`);
    }

    return {
      size: file.size,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      diskSize,
    };
  }

  /**
   * Copy file from one entity to another
   */
  async copyFile(
    sourceFileId: string,
    targetEntityType: EntityType,
    targetEntityId: string,
    targetFieldName: string,
  ): Promise<PrismaFile> {
    const sourceFile = await this.prisma.file.findUnique({
      where: { id: sourceFileId },
    });

    if (!sourceFile) {
      throw new NotFoundException(`Source file with ID ${sourceFileId} not found`);
    }

    // Validate target entity exists
    await this.validateEntityExists(targetEntityType, targetEntityId);

    // Copy physical file
    const targetFolder = path.join(this.uploadDir, targetEntityType.toLowerCase());
    await fs.ensureDir(targetFolder);

    const newFileName = `${uuidv4()}${path.extname(sourceFile.originalName)}`;
    const newFilePath = path.join(targetFolder, newFileName);
    const newPublicUrl = this.getPublicUrl(newFilePath);

    await fs.copy(sourceFile.path, newFilePath);

    // Create new file record
    const newFile = await this.prisma.file.create({
      data: {
        filename: newFileName,
        originalName: sourceFile.originalName,
        mimeType: sourceFile.mimeType,
        size: sourceFile.size,
        path: newFilePath,
        url: newPublicUrl,
        entityType: targetEntityType,
        entityId: targetEntityId,
        fieldName: targetFieldName,
      },
    });

    // Update target entity reference
    await this.updateEntityFileReference(
      targetEntityType,
      targetEntityId,
      targetFieldName,
      newPublicUrl,
    );

    this.logger.log(`File copied from ${sourceFileId} to ${targetEntityType}:${targetEntityId}`);
    return newFile;
  }
}