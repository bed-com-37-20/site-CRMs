// src/modules/carriers/carriers.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { DatabaseService } from '../database/database.service';
import { FilesService } from '../files/files.service';
import { EntityType } from '../files/dto/file.dto';
import { ReadStream } from 'fs';
import { CompanyService } from '../company/company.service';

@Injectable()
export class CarriersService {
  private readonly logger = new Logger(CarriersService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly fileService: FilesService,
    private readonly companyService: CompanyService,
  ) {}

  async create(
    companyInfoId: string,
    createCarrierDto: Prisma.CarrierCreateInput,
  ) {
    // Verify company exists
    const company = await this.companyService.findOne(companyInfoId);
    if (!company) {
      throw new NotFoundException(`Company with ID ${companyInfoId} not found`);
    }

    return await this.databaseService.carrier.create({
      data: {
        ...createCarrierDto,
        companyInfo: { connect: { id: companyInfoId } },
      },
    });
  }

  async findAll() {
    return await this.databaseService.carrier.findMany({
      include: {
        companyInfo: true,
        applications: true,
      },
    });
  }

  async findOne(id: string) {
    const carrier = await this.databaseService.carrier.findUnique({ 
      where: { id },
      include: {
        companyInfo: true,
        applications: true,
      },
    });
    
    if (!carrier) {
      throw new NotFoundException(`Carrier with ID ${id} not found`);
    }
    
    return carrier;
  }

  async update(id: string, updateCarrierDto: Prisma.CarrierUpdateInput) {
    // Check if carrier exists
    await this.findOne(id);
    
    return await this.databaseService.carrier.update({
      where: { id },
      data: updateCarrierDto,
    });
  }

  async remove(id: string) {
    // Check if carrier exists
    const carrier = await this.findOne(id);
    
    // First delete all associated applications and their files
    const applications = await this.databaseService.application.findMany({
      where: { carrierId: id },
    });
    
    for (const application of applications) {
      await this.deleteApplicationFiles(application.id);
    }
    
    // Then delete the carrier
    return await this.databaseService.carrier.delete({ where: { id } });
  }

  /**
   * Delete application files from storage
   */
  private async deleteApplicationFiles(applicationId: string) {
    await this.fileService.deleteEntityFiles(EntityType.APPLICATION, applicationId);
  }

  /**
   * Submit an application for a carrier job using FileService
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
      throw new NotFoundException(`Carrier with ID ${carrierId} not found`);
    }

    if (!resumeFile) {
      throw new BadRequestException('Resume file is required');
    }

    // Validate resume file type (PDF, DOC, DOCX)
    const allowedMimes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedMimes.includes(resumeFile.mimetype)) {
      throw new BadRequestException('Resume must be a PDF or Word document');
    }

    try {
      // Upload resume using FileService
      const uploadedResume = await this.fileService.uploadFile(resumeFile, {
        entityType: EntityType.APPLICATION,
        entityId: carrierId, // This will be updated after application creation
        fieldName: 'resumeUrl',
      });

      let uploadedCoverLetter={} as any
      
      // Upload cover letter if provided
      if (coverLetterFile) {
        // Validate cover letter file type
        if (!allowedMimes.includes(coverLetterFile.mimetype)) {
          throw new BadRequestException('Cover letter must be a PDF or Word document');
        }
        
       uploadedCoverLetter = await this.fileService.uploadFile(coverLetterFile, {
          entityType: EntityType.APPLICATION,
          entityId: carrierId,
          fieldName: 'coverlettUrUrl',
        });
      }

      // Create application record
      const application = await this.databaseService.application.create({
        data: {
          fullName: applicationData.fullName,
          email: applicationData.email,
          phone: applicationData.phone,
          position: applicationData.position,
          resumeUrl: uploadedResume.url,
          coverlettUrUrl: uploadedCoverLetter?.url || null,
          carrier: { connect: { id: carrierId } },
          status: 'PENDING',
        },
      });

      // Update files with the actual application ID
      await this.fileService.updateFile(uploadedResume.id, {}, undefined);
      
      if (uploadedCoverLetter) {
        await this.fileService.updateFile(uploadedCoverLetter.id, {}, undefined);
      }

      this.logger.log(`Application submitted successfully for carrier ${carrierId}`);
      
      return {
        message: 'Application submitted successfully',
        application,
      };
    } catch (error) {
      this.logger.error(`Failed to submit application: ${error}`);
      throw new BadRequestException(`Failed to submit application: ${error}`);
    }
  }

  /**
   * Get all applications for a carrier
   */
  async getApplications(carrierId: string) {
    const carrier = await this.databaseService.carrier.findUnique({
      where: { id: carrierId },
    });
    
    if (!carrier) {
      throw new NotFoundException(`Carrier with ID ${carrierId} not found`);
    }
    
    return await this.databaseService.application.findMany({
      where: { carrierId },
      include: { carrier: true },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get a single application with file details
   */
  async getApplicationById(applicationId: string) {
    const application = await this.databaseService.application.findUnique({
      where: { id: applicationId },
      include: { carrier: true },
    });
    
    if (!application) {
      throw new NotFoundException(`Application with ID ${applicationId} not found`);
    }
    
    // Get file details from FileService
    const resumeFile = await this.fileService.getFileByField(
      EntityType.APPLICATION,
      applicationId,
      'resumeUrl',
    );
    
    const coverLetterFile = await this.fileService.getFileByField(
      EntityType.APPLICATION,
      applicationId,
      'coverlettUrUrl',
    );
    
    return {
      ...application,
      files: {
        resume: resumeFile,
        coverLetter: coverLetterFile,
      },
    };
  }

  /**
   * Get application file stream (resume or cover letter)
   */
  async getApplicationFileStream(applicationId: string, fileType: 'resume' | 'coverLetter'): Promise<ReadStream> {
    const application = await this.databaseService.application.findUnique({
      where: { id: applicationId },
    });
    
    if (!application) {
      throw new NotFoundException(`Application with ID ${applicationId} not found`);
    }
    
    const fieldName = fileType === 'resume' ? 'resumeUrl' : 'coverlettUrUrl';
    const file = await this.fileService.getFileByField(
      EntityType.APPLICATION,
      applicationId,
      fieldName,
    );
    
    if (!file) {
      throw new NotFoundException(`${fileType} file not found for this application`);
    }
    
    try {
      const { stream } = await this.fileService.getFileStream(file.id);
      return stream;
    } catch (error) {
      this.logger.error(`Failed to get ${fileType} stream: ${error}`);
      throw new NotFoundException(`Failed to retrieve ${fileType} file`);
    }
  }

  /**
   * Update application status
   */
  async updateApplicationStatus(
    applicationId: string,
    status: 'PENDING' | 'REVIEWING' | 'ACCEPTED' | 'REJECTED',
  ) {
    const application = await this.databaseService.application.findUnique({
      where: { id: applicationId },
    });
    
    if (!application) {
      throw new NotFoundException(`Application with ID ${applicationId} not found`);
    }
    
    this.logger.log(`Application ${applicationId} status updated to ${status}`);
    
    return await this.databaseService.application.update({
      where: { id: applicationId },
      data: { status },
    });
  }

  /**
   * Delete an application and its associated files
   */
  async deleteApplication(applicationId: string) {
    const application = await this.databaseService.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${applicationId} not found`);
    }

    // Delete files from FileService
    await this.fileService.deleteEntityFiles(EntityType.APPLICATION, applicationId);

    // Delete application from database
    const deletedApplication = await this.databaseService.application.delete({
      where: { id: applicationId },
    });
    
    this.logger.log(`Application ${applicationId} deleted successfully`);
    
    return {
      message: 'Application deleted successfully',
      application: deletedApplication,
    };
  }

  /**
   * Get application statistics for a carrier
   */
  async getApplicationStats(carrierId: string) {
    const carrier = await this.databaseService.carrier.findUnique({
      where: { id: carrierId },
    });
    
    if (!carrier) {
      throw new NotFoundException(`Carrier with ID ${carrierId} not found`);
    }
    
    const stats = await this.databaseService.application.groupBy({
      by: ['status'],
      where: { carrierId },
      _count: {
        status: true,
      },
    });
    
    const total = await this.databaseService.application.count({
      where: { carrierId },
    });
    
    const statusCounts = {
      PENDING: 0,
      REVIEWING: 0,
      ACCEPTED: 0,
      REJECTED: 0,
    };
    
    stats.forEach((stat) => {
      statusCounts[stat.status as keyof typeof statusCounts] = stat._count.status;
    });
    
    return {
      total,
      ...statusCounts,
    };
  }

  /**
   * Get all applications with filtering
   */
  async getApplicationsWithFilters(
    carrierId: string,
    filters?: {
      status?: 'PENDING' | 'REVIEWING' | 'ACCEPTED' | 'REJECTED';
      startDate?: Date;
      endDate?: Date;
      position?: string;
    },
  ) {
    const carrier = await this.databaseService.carrier.findUnique({
      where: { id: carrierId },
    });
    
    if (!carrier) {
      throw new NotFoundException(`Carrier with ID ${carrierId} not found`);
    }
    
    const where: any = { carrierId };
    
    if (filters?.status) {
      where.status = filters.status;
    }
    
    if (filters?.position) {
      where.position = {
        contains: filters.position,
        mode: 'insensitive',
      };
    }
    
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }
    
    return await this.databaseService.application.findMany({
      where,
      include: { carrier: true },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}