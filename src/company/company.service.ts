import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Prisma } from 'generated/prisma/client';
import { MinioService } from '../minio/minio.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class CompanyService {
  private readonly bucketName = 'company';

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly minioService: MinioService,
  ) {}

  async create(
    userId: string,
    createCompanyDto: Prisma.CompanyInfoCreateInput,
  ) {
    return await this.databaseService.companyInfo.create({
      data: {
        ...createCompanyDto,
        owner: { connect: { id: userId } },
      },
    });
  }

  async findAll(userId: string) {
    return await this.databaseService.companyInfo.findMany({
      where: { owner: { id: userId } },
    });
  }

  async findOne(id: string) {
    return await this.databaseService.companyInfo.findUnique({
      where: { id },
      include: { owner: true },
    });
  }

  async update(id: string, updateCompanyDto: Prisma.CompanyInfoUpdateInput) {
    return await this.databaseService.companyInfo.update({
      where: { id },
      data: updateCompanyDto,
    });
  }

  async remove(id: string) {
    return await this.databaseService.companyInfo.delete({ where: { id } });
  }

  /**
   * Upload a logo for a company
   * @param companyId - Company ID
   * @param file - File object from Express
   */
  async uploadLogo(companyId: string, file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file provided');
    }

    // Validate file is an image
    if (!file.mimetype.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Generate a unique filename
    const fileName = `${companyId}/logo/${uuid()}-${file.originalname}`;

    // Upload to MinIO
    await this.minioService.uploadFile(
      this.bucketName,
      fileName,
      file.buffer,
      file.mimetype,
    );

    // Store just the file path (not presigned URL) to avoid signature expiration
    const logoUrl = fileName;

    // Update company with logo URL
    return await this.databaseService.companyInfo.update({
      where: { id: companyId },
      data: { logoUrl },
    });
  }

  /**
   * Upload a cover image for a company
   * @param companyId - Company ID
   * @param file - File object from Express
   */
  async uploadCoverImage(companyId: string, file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file provided');
    }

    // Validate file is an image
    if (!file.mimetype.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Generate a unique filename
    const fileName = `${companyId}/cover/${uuid()}-${file.originalname}`;

    // Upload to MinIO
    await this.minioService.uploadFile(
      this.bucketName,
      fileName,
      file.buffer,
      file.mimetype,
    );

    // Store just the file path (not presigned URL) to avoid signature expiration
    const coverImageUrl = fileName;

    // Update company with cover image URL
    return await this.databaseService.companyInfo.update({
      where: { id: companyId },
      data: { coverImageUrl },
    });
  }

  /**
   * Upload a generic file for a company (documents, etc.)
   * @param companyId - Company ID
   * @param file - File object from Express
   */
  async uploadFile(companyId: string, file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file provided');
    }

    // Generate a unique filename
    const fileName = `${companyId}/files/${uuid()}-${file.originalname}`;

    // Upload to MinIO
    await this.minioService.uploadFile(
      this.bucketName,
      fileName,
      file.buffer,
      file.mimetype,
    );

    // Store just the file path (not presigned URL) to avoid signature expiration
    return {
      fileName: file.originalname,
      filePath: fileName,
      uploadedAt: new Date(),
    };
  }

  /**
   * Delete a logo
   * @param companyId - Company ID
   */
  async deleteLogo(companyId: string) {
    const company = await this.databaseService.companyInfo.findUnique({
      where: { id: companyId },
    });

    if (!company || !company.logoUrl) {
      throw new Error('Company or logo not found');
    }

    // Delete from MinIO
    await this.minioService.deleteFile(this.bucketName, company.logoUrl);

    // Update company record
    return await this.databaseService.companyInfo.update({
      where: { id: companyId },
      data: { logoUrl: null },
    });
  }

  /**
   * Delete a cover image
   * @param companyId - Company ID
   */
  async deleteCoverImage(companyId: string) {
    const company = await this.databaseService.companyInfo.findUnique({
      where: { id: companyId },
    });

    if (!company || !company.coverImageUrl) {
      throw new Error('Company or cover image not found');
    }

    // Delete from MinIO
    await this.minioService.deleteFile(this.bucketName, company.coverImageUrl);

    // Update company record
    return await this.databaseService.companyInfo.update({
      where: { id: companyId },
      data: { coverImageUrl: null },
    });
  }

  /**
   * Get logo stream
   * @param companyId - Company ID
   */
  async getLogoStream(companyId: string) {
    const company = await this.databaseService.companyInfo.findUnique({
      where: { id: companyId },
    });

    if (!company || !company.logoUrl) {
      throw new Error('Company or logo not found');
    }

    // Get file stream from MinIO
    return await this.minioService.getFileStream(
      this.bucketName,
      company.logoUrl,
    );
  }

  /**
   * Get cover image stream
   * @param companyId - Company ID
   */
  async getCoverImageStream(companyId: string) {
    const company = await this.databaseService.companyInfo.findUnique({
      where: { id: companyId },
    });

    if (!company || !company.coverImageUrl) {
      throw new Error('Company or cover image not found');
    }

    // Get file stream from MinIO
    return await this.minioService.getFileStream(
      this.bucketName,
      company.coverImageUrl,
    );
  }
}
