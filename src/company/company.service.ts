// src/modules/company/company.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Prisma } from 'generated/prisma/client';
import { EntityType } from '../files/dto/file.dto';
import { ReadStream } from 'fs';
import { FilesService } from 'src/files/files.service';

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly fileService: FilesService,
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

  async findAll() {
    return await this.databaseService.companyInfo.findMany();
  }

  async findOne(id: string) {
    return await this.databaseService.companyInfo.findUnique({
      where: { id },
      include: { 
        owner: true,
        products: true,
        carriers: true,
        events: true,
      },
    });
  }

  async update(id: string, updateCompanyDto: Prisma.CompanyInfoUpdateInput) {
    return await this.databaseService.companyInfo.update({
      where: { id },
      data: updateCompanyDto,
    });
  }

  async remove(id: string) {
    // First delete all associated files
    await this.fileService.deleteEntityFiles(EntityType.COMPANY_INFO, id);
    
    // Then delete the company
    return await this.databaseService.companyInfo.delete({ where: { id } });
  }

  /**
   * Upload a logo for a company using FileService
   */
  async uploadLogo(companyId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file is an image
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }

    // Check if company exists
    const company = await this.databaseService.companyInfo.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }

    try {
      // Upload file using FileService
      const uploadedFile = await this.fileService.uploadFile(file, {
        entityType: EntityType.COMPANY_INFO,
        entityId: companyId,
        fieldName: 'logoUrl',
      });

      this.logger.log(`Logo uploaded successfully for company ${companyId}`);
      
      return {
        message: 'Logo uploaded successfully',
        file: uploadedFile,
        company: await this.databaseService.companyInfo.findUnique({
          where: { id: companyId },
        }),
      };
    } catch (error) {
      this.logger.error(`Failed to upload logo: ${error}`);
      throw new BadRequestException(`Failed to upload logo: ${error}`);
    }
  }

  /**
   * Upload a cover image for a company using FileService
   */
  async uploadCoverImage(companyId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file is an image
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }

    // Check if company exists
    const company = await this.databaseService.companyInfo.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }

    try {
      // Upload file using FileService
      const uploadedFile = await this.fileService.uploadFile(file, {
        entityType: EntityType.COMPANY_INFO,
        entityId: companyId,
        fieldName: 'coverImageUrl',
      });

      this.logger.log(`Cover image uploaded successfully for company ${companyId}`);
      
      return {
        message: 'Cover image uploaded successfully',
        file: uploadedFile,
        company: await this.databaseService.companyInfo.findUnique({
          where: { id: companyId },
        }),
      };
    } catch (error) {
      this.logger.error(`Failed to upload cover image: ${error}`);
      throw new BadRequestException(`Failed to upload cover image: ${error}`);
    }
  }

  /**
   * Upload a generic file for a company using FileService
   */
  async uploadFile(companyId: string, file: Express.Multer.File, fieldName: string = 'attachment') {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Check if company exists
    const company = await this.databaseService.companyInfo.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }

    try {
      // Upload file using FileService
      const uploadedFile = await this.fileService.uploadFile(file, {
        entityType: EntityType.COMPANY_INFO,
        entityId: companyId,
        fieldName: fieldName,
      });

      this.logger.log(`File uploaded successfully for company ${companyId}`);
      
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
   * Delete a logo
   */
  async deleteLogo(companyId: string) {
    // Check if company exists
    const company = await this.databaseService.companyInfo.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }

    // Find the logo file
    const logoFile = await this.fileService.getFileByField(
      EntityType.COMPANY_INFO,
      companyId,
      'logoUrl',
    );

    if (!logoFile) {
      throw new NotFoundException('Logo not found for this company');
    }

    try {
      // Delete the file
      await this.fileService.deleteFile(logoFile.id);
      
      this.logger.log(`Logo deleted successfully for company ${companyId}`);
      
      return {
        message: 'Logo deleted successfully',
        company: await this.databaseService.companyInfo.findUnique({
          where: { id: companyId },
        }),
      };
    } catch (error) {
      this.logger.error(`Failed to delete logo: ${error}`);
      throw new BadRequestException(`Failed to delete logo: ${error}`);
    }
  }

  /**
   * Delete a cover image
   */
  async deleteCoverImage(companyId: string) {
    // Check if company exists
    const company = await this.databaseService.companyInfo.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }

    // Find the cover image file
    const coverFile = await this.fileService.getFileByField(
      EntityType.COMPANY_INFO,
      companyId,
      'coverImageUrl',
    );

    if (!coverFile) {
      throw new NotFoundException('Cover image not found for this company');
    }

    try {
      // Delete the file
      await this.fileService.deleteFile(coverFile.id);
      
      this.logger.log(`Cover image deleted successfully for company ${companyId}`);
      
      return {
        message: 'Cover image deleted successfully',
        company: await this.databaseService.companyInfo.findUnique({
          where: { id: companyId },
        }),
      };
    } catch (error) {
      this.logger.error(`Failed to delete cover image: ${error}`);
      throw new BadRequestException(`Failed to delete cover image: ${error}`);
    }
  }

  /**
   * Get logo stream
   */
  async getLogoStream(companyId: string): Promise<ReadStream> {
    // Check if company exists
    const company = await this.databaseService.companyInfo.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }

    // Find the logo file
    const logoFile = await this.fileService.getFileByField(
      EntityType.COMPANY_INFO,
      companyId,
      'logoUrl',
    );

    if (!logoFile) {
      throw new NotFoundException('Logo not found for this company');
    }

    try {
      // Get file stream
      const { stream } = await this.fileService.getFileStream(logoFile.id);
      return stream;
    } catch (error) {
      this.logger.error(`Failed to get logo stream: ${error}`);
      throw new NotFoundException('Failed to retrieve logo');
    }
  }

  /**
   * Get cover image stream
   */
  async getCoverImageStream(companyId: string): Promise<ReadStream> {
    // Check if company exists
    const company = await this.databaseService.companyInfo.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }

    // Find the cover image file
    const coverFile = await this.fileService.getFileByField(
      EntityType.COMPANY_INFO,
      companyId,
      'coverImageUrl',
    );

    if (!coverFile) {
      throw new NotFoundException('Cover image not found for this company');
    }

    try {
      // Get file stream
      const { stream } = await this.fileService.getFileStream(coverFile.id);
      return stream;
    } catch (error) {
      this.logger.error(`Failed to get cover image stream: ${error}`);
      throw new NotFoundException('Failed to retrieve cover image');
    }
  }

  /**
   * Get all files for a company
   */
  async getAllCompanyFiles(companyId: string) {
    // Check if company exists
    const company = await this.databaseService.companyInfo.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }

    return await this.fileService.getFilesByEntity(EntityType.COMPANY_INFO, companyId);
  }

  /**
   * Get a specific file by field name
   */
  async getCompanyFileByField(companyId: string, fieldName: string) {
    // Check if company exists
    const company = await this.databaseService.companyInfo.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }

    const file = await this.fileService.getFileByField(
      EntityType.COMPANY_INFO,
      companyId,
      fieldName,
    );

    if (!file) {
      throw new NotFoundException(`File for field '${fieldName}' not found`);
    }

    return file;
  }

  /**
   * Update company logo with a new file
   */
  async updateLogo(companyId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file is an image
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }

    // Check if company exists
    const company = await this.databaseService.companyInfo.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }

    // Find existing logo
    const existingLogo = await this.fileService.getFileByField(
      EntityType.COMPANY_INFO,
      companyId,
      'logoUrl',
    );

    try {
      let uploadedFile;
      
      if (existingLogo) {
        // Update existing logo
        uploadedFile = await this.fileService.updateFile(existingLogo.id, {}, file);
        this.logger.log(`Logo updated successfully for company ${companyId}`);
      } else {
        // Upload new logo
        uploadedFile = await this.fileService.uploadFile(file, {
          entityType: EntityType.COMPANY_INFO,
          entityId: companyId,
          fieldName: 'logoUrl',
        });
        this.logger.log(`Logo uploaded successfully for company ${companyId}`);
      }

      return {
        message: existingLogo ? 'Logo updated successfully' : 'Logo uploaded successfully',
        file: uploadedFile,
        company: await this.databaseService.companyInfo.findUnique({
          where: { id: companyId },
        }),
      };
    } catch (error) {
      this.logger.error(`Failed to update logo: ${error}`);
      throw new BadRequestException(`Failed to update logo: ${error}`);
    }
  }
}