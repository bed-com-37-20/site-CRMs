// src/modules/user/user.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { DatabaseService } from '../database/database.service';
import { FilesService } from '../files/files.service';
import { EntityType } from '../files/dto/file.dto';
import { ReadStream } from 'fs';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly fileService: FilesService,
  ) {}

  async create(createUserDto: Prisma.UserCreateInput) {
    return await this.databaseService.user.create({ data: createUserDto });
  }

  async findAll() {
    return await this.databaseService.user.findMany();
  }

  async findOne(id: string) {
    const user = await this.databaseService.user.findUnique({ 
      where: { id },
      include: {
        companyInfos: true,
      }
    });
    
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    return user;
  }

  async update(id: string, updateUserDto: Prisma.UserUpdateInput) {
    // Check if user exists
    await this.findOne(id);
    
    return await this.databaseService.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  async remove(id: string) {
    // Check if user exists
    const user = await this.findOne(id);
    
    // First delete all associated files
    await this.fileService.deleteEntityFiles(EntityType.USER, id);
    
    // Then delete the user
    return await this.databaseService.user.delete({ where: { id } });
  }

  /**
   * Upload a profile picture for a user using FileService
   */
  async uploadProfilePicture(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file is an image
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }

    // Check if user exists
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    try {
      // Upload file using FileService
      const uploadedFile = await this.fileService.uploadFile(file, {
        entityType: EntityType.USER,
        entityId: userId,
        fieldName: 'profilePicUrl',
      });

      this.logger.log(`Profile picture uploaded successfully for user ${userId}`);
      
      return {
        message: 'Profile picture uploaded successfully',
        file: uploadedFile,
        user: await this.databaseService.user.findUnique({
          where: { id: userId },
        }),
      };
    } catch (error) {
      this.logger.error(`Failed to upload profile picture: ${error}`);
      throw new BadRequestException(`Failed to upload profile picture: ${error}`);
    }
  }

  /**
   * Update profile picture for a user (replace existing)
   */
  async updateProfilePicture(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file is an image
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }

    // Check if user exists
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Find existing profile picture
    const existingFile = await this.fileService.getFileByField(
      EntityType.USER,
      userId,
      'profilePicUrl',
    );

    try {
      let uploadedFile;
      
      if (existingFile) {
        // Update existing profile picture
        uploadedFile = await this.fileService.updateFile(existingFile.id, {}, file);
        this.logger.log(`Profile picture updated successfully for user ${userId}`);
      } else {
        // Upload new profile picture
        uploadedFile = await this.fileService.uploadFile(file, {
          entityType: EntityType.USER,
          entityId: userId,
          fieldName: 'profilePicUrl',
        });
        this.logger.log(`Profile picture uploaded successfully for user ${userId}`);
      }

      return {
        message: existingFile ? 'Profile picture updated successfully' : 'Profile picture uploaded successfully',
        file: uploadedFile,
        user: await this.databaseService.user.findUnique({
          where: { id: userId },
        }),
      };
    } catch (error) {
      this.logger.error(`Failed to update profile picture: ${error}`);
      throw new BadRequestException(`Failed to update profile picture: ${error}`);
    }
  }

  /**
   * Delete profile picture for a user
   */
  async deleteProfilePicture(userId: string) {
    // Check if user exists
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Find the profile picture file
    const profilePicFile = await this.fileService.getFileByField(
      EntityType.USER,
      userId,
      'profilePicUrl',
    );

    if (!profilePicFile) {
      throw new NotFoundException('Profile picture not found for this user');
    }

    try {
      // Delete the file
      await this.fileService.deleteFile(profilePicFile.id);
      
      this.logger.log(`Profile picture deleted successfully for user ${userId}`);
      
      return {
        message: 'Profile picture deleted successfully',
        user: await this.databaseService.user.findUnique({
          where: { id: userId },
        }),
      };
    } catch (error) {
      this.logger.error(`Failed to delete profile picture: ${error}`);
      throw new BadRequestException(`Failed to delete profile picture: ${error}`);
    }
  }

  /**
   * Get profile picture stream for a user
   */
  async getProfilePictureStream(userId: string): Promise<ReadStream> {
    // Check if user exists
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Find the profile picture file
    const profilePicFile = await this.fileService.getFileByField(
      EntityType.USER,
      userId,
      'profilePicUrl',
    );

    if (!profilePicFile) {
      throw new NotFoundException('Profile picture not found for this user');
    }

    try {
      // Get file stream
      const { stream } = await this.fileService.getFileStream(profilePicFile.id);
      return stream;
    } catch (error) {
      this.logger.error(`Failed to get profile picture stream: ${error}`);
      throw new NotFoundException('Failed to retrieve profile picture');
    }
  }

  /**
   * Get profile picture URL (if you need direct URL access)
   */
  async getProfilePictureUrl(userId: string): Promise<string | null> {
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const profilePicFile = await this.fileService.getFileByField(
      EntityType.USER,
      userId,
      'profilePicUrl',
    );

    return profilePicFile ? profilePicFile.url : null;
  }

  /**
   * Get all files for a user
   */
  async getAllUserFiles(userId: string) {
    // Check if user exists
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return await this.fileService.getFilesByEntity(EntityType.USER, userId);
  }

  /**
   * Get a specific file by field name
   */
  async getUserFileByField(userId: string, fieldName: string) {
    // Check if user exists
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const file = await this.fileService.getFileByField(
      EntityType.USER,
      userId,
      fieldName,
    );

    if (!file) {
      throw new NotFoundException(`File for field '${fieldName}' not found`);
    }

    return file;
  }

  /**
   * Upload a generic file for a user
   */
  async uploadUserFile(userId: string, file: Express.Multer.File, fieldName: string = 'attachment') {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Check if user exists
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    try {
      // Upload file using FileService
      const uploadedFile = await this.fileService.uploadFile(file, {
        entityType: EntityType.USER,
        entityId: userId,
        fieldName: fieldName,
      });

      this.logger.log(`File uploaded successfully for user ${userId}`);
      
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
  async deleteUserFileByField(userId: string, fieldName: string) {
    // Check if user exists
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const file = await this.fileService.getFileByField(
      EntityType.USER,
      userId,
      fieldName,
    );

    if (!file) {
      throw new NotFoundException(`File for field '${fieldName}' not found`);
    }

    try {
      await this.fileService.deleteFile(file.id);
      
      this.logger.log(`File ${fieldName} deleted successfully for user ${userId}`);
      
      return {
        message: `File '${fieldName}' deleted successfully`,
      };
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error}`);
      throw new BadRequestException(`Failed to delete file: ${error}`);
    }
  }
}