import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { DatabaseService } from '../database/database.service';
import { MinioService } from '../minio/minio.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class CarriersService {
  private readonly bucketName = 'applications';

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly minioService: MinioService,
  ) {}

  async create(
    companyInfoId: string,
    createCarrierDto: Prisma.CarrierCreateInput,
  ) {
    return await this.databaseService.carrier.create({
      data: {
        ...createCarrierDto,
        companyInfo: { connect: { id: companyInfoId } },
      },
    });
  }

  async findAll(companyInfoId: string) {
    return await this.databaseService.carrier.findMany({
      where: { companyInfo: { id: companyInfoId } },
    });
  }

  async findOne(id: string) {
    return await this.databaseService.carrier.findUnique({ where: { id } });
  }

  async update(id: string, updateCarrierDto: Prisma.CarrierUpdateInput) {
    return await this.databaseService.carrier.update({
      where: { id },
      data: updateCarrierDto,
    });
  }

  async remove(id: string) {
    return await this.databaseService.carrier.delete({ where: { id } });
  }

  /**
   * Submit an application for a carrier job
   * @param carrierId - Carrier ID
   * @param applicationData - Application data
   * @param resumeFile - Resume file
   * @param coverLetterFile - Optional cover letter file
   */
  async submitApplication(
    carrierId: string,
    applicationData: {
      fullName: string;
      email: string;
      phone: string;
      position: string;
    },
    resumeFile: Express.Multer.File,
    coverLetterFile?: Express.Multer.File,
  ) {
    // Validate carrier exists
    const carrier = await this.databaseService.carrier.findUnique({
      where: { id: carrierId },
    });
    if (!carrier) {
      throw new Error('Carrier not found');
    }

    if (!resumeFile) {
      throw new Error('Resume file is required');
    }

    // Upload resume
    const resumeFileName = `${carrierId}/${uuid()}-resume-${resumeFile.originalname}`;
    await this.minioService.uploadFile(
      this.bucketName,
      resumeFileName,
      resumeFile.buffer,
      resumeFile.mimetype,
    );
    // Store just the file path (not presigned URL) to avoid signature expiration
    const resumeUrl = resumeFileName;

    // Upload cover letter if provided
    let coverLetterUrl: string | null = null;
    if (coverLetterFile) {
      const coverLetterFileName = `${carrierId}/${uuid()}-cover-letter-${coverLetterFile.originalname}`;
      await this.minioService.uploadFile(
        this.bucketName,
        coverLetterFileName,
        coverLetterFile.buffer,
        coverLetterFile.mimetype,
      );
      // Store just the file path (not presigned URL) to avoid signature expiration
      coverLetterUrl = coverLetterFileName;
    }

    // Create application record
    return await this.databaseService.application.create({
      data: {
        fullName: applicationData.fullName,
        email: applicationData.email,
        phone: applicationData.phone,
        position: applicationData.position,
        resumeUrl,
        coverlettUrUrl: coverLetterUrl,
        carrier: { connect: { id: carrierId } },
        status: 'PENDING',
      },
    });
  }

  /**
   * Get all applications for a carrier
   * @param carrierId - Carrier ID
   */
  async getApplications(carrierId: string) {
    return await this.databaseService.application.findMany({
      where: { carrierId },
      include: { carrier: true },
    });
  }

  /**
   * Get a single application
   * @param applicationId - Application ID
   */
  async getApplicationById(applicationId: string) {
    return await this.databaseService.application.findUnique({
      where: { id: applicationId },
      include: { carrier: true },
    });
  }

  /**
   * Update application status
   * @param applicationId - Application ID
   * @param status - New status
   */
  async updateApplicationStatus(
    applicationId: string,
    status: 'PENDING' | 'REVIEWING' | 'ACCEPTED' | 'REJECTED',
  ) {
    return await this.databaseService.application.update({
      where: { id: applicationId },
      data: { status },
    });
  }

  /**
   * Delete an application
   * @param applicationId - Application ID
   */
  async deleteApplication(applicationId: string) {
    const application = await this.databaseService.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    // Delete files from MinIO
    if (application.resumeUrl) {
      const resumeParts = application.resumeUrl.split('/');
      const resumeFileName = resumeParts.slice(-2).join('/');
      await this.minioService.deleteFile(this.bucketName, resumeFileName);
    }

    if (application.coverlettUrUrl) {
      const letterParts = application.coverlettUrUrl.split('/');
      const letterFileName = letterParts.slice(-2).join('/');
      await this.minioService.deleteFile(this.bucketName, letterFileName);
    }

    // Delete application from database
    return await this.databaseService.application.delete({
      where: { id: applicationId },
    });
  }
}
