import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { DatabaseService } from '../database/database.service';
import { MinioService } from '../minio/minio.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class UserService {
  private readonly bucketName = 'users';

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly minioService: MinioService,
  ) {}

  async create(createUserDto: Prisma.UserCreateInput) {
    return await this.databaseService.user.create({ data: createUserDto });
  }

  async findAll() {
    return await this.databaseService.user.findMany();
  }

  async findOne(id: string) {
    return await this.databaseService.user.findUnique({ where: { id } });
  }

  async update(id: string, updateUserDto: Prisma.UserUpdateInput) {
    return await this.databaseService.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  async remove(id: string) {
    console.log(await this.databaseService.user.findUnique({ where: { id } }));
    return await this.databaseService.user.delete({ where: { id } });
  }

  /**
   * Upload a profile picture for a user
   * @param userId - User ID
   * @param file - File object from Express
   */
  async uploadProfilePicture(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file provided');
    }

    // Generate a unique filename
    const fileName = `${userId}/${uuid()}-${file.originalname}`;

    // Upload to MinIO
    await this.minioService.uploadFile(
      this.bucketName,
      fileName,
      file.buffer,
      file.mimetype,
    );

    // Store just the file path (not presigned URL) to avoid signature expiration
    // The proxy endpoint will handle generating fresh access
    const profilePicUrl = fileName;

    // Update user with profile picture path
    return await this.databaseService.user.update({
      where: { id: userId },
      data: { profilePicUrl },
    });
  }

  /**
   * Delete a profile picture for a user
   * @param userId - User ID
   */
  async deleteProfilePicture(userId: string) {
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.profilePicUrl) {
      throw new Error('User or profile picture not found');
    }

    // Extract filename from URL
    const urlParts = user.profilePicUrl.split('/');
    const fileName = urlParts.slice(-2).join('/');

    // Delete from MinIO
    await this.minioService.deleteFile(this.bucketName, fileName);

    // Update user record
    return await this.databaseService.user.update({
      where: { id: userId },
      data: { profilePicUrl: null },
    });
  }

  /**
   * Get profile picture stream for a user
   * @param userId - User ID
   */
  async getProfilePictureStream(userId: string) {
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.profilePicUrl) {
      throw new Error('User or profile picture not found');
    }

    // Extract filename from URL
    const urlParts = user.profilePicUrl.split('/');
    const fileName = urlParts.slice(-2).join('/');

    // Get file stream from MinIO
    return await this.minioService.getFileStream(this.bucketName, fileName);
  }
}
