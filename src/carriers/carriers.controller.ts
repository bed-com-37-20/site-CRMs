import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Query,
  Delete,
  Param,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CarriersService } from './carriers.service';
import { Prisma } from 'generated/prisma/client';

@Controller('carriers')
export class CarriersController {
  constructor(private readonly carriersService: CarriersService) {}

  @Post()
  async create(
    @Query('companyInfoId') companyInfoId: string,
    @Body() createCarrierDto: Prisma.CarrierCreateInput,
  ) {
    return await this.carriersService.create(companyInfoId, createCarrierDto);
  }

  @Get()
  async findAll() {
    return await this.carriersService.findAll();
  }

  @Get(':id')
  async findOne(@Query('id') id: string) {
    return await this.carriersService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Query('id') id: string,
    @Body() updateCarrierDto: Prisma.CarrierUpdateInput,
  ) {
    return await this.carriersService.update(id, updateCarrierDto);
  }

  @Delete(':id')
  async remove(@Query('id') id: string) {
    return await this.carriersService.remove(id);
  }

  @Post(':id/apply')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'resume', maxCount: 1 },
      { name: 'coverLetter', maxCount: 1 },
    ]),
  )
  async submitApplication(
    @Param('id') carrierId: string,
    @Body()
    applicationData: {
      fullName: string;
      email: string;
      phone: string;
      position: string;
    },
    @UploadedFiles()
    files: {
      resume: Express.Multer.File;
      coverLetter: Express.Multer.File;
    },
  ) {
    return await this.carriersService.submitApplication(
      carrierId,
      applicationData,
      files.resume,
      files.coverLetter,
    );
  }

  @Get(':id/applications')
  async getApplications(@Param('id') carrierId: string) {
    return await this.carriersService.getApplications(carrierId);
  }

  @Get('applications/:applicationId')
  async getApplicationById(@Param('applicationId') applicationId: string) {
    return await this.carriersService.getApplicationById(applicationId);
  }

  @Patch('applications/:applicationId/status')
  async updateApplicationStatus(
    @Param('applicationId') applicationId: string,
    @Body() { status }: { status: 'PENDING' | 'REVIEWING' | 'ACCEPTED' | 'REJECTED' },
  ) {
    return await this.carriersService.updateApplicationStatus(
      applicationId,
      status,
    );
  }

  @Delete('applications/:applicationId')
  async deleteApplication(@Param('applicationId') applicationId: string) {
    return await this.carriersService.deleteApplication(applicationId);
  }
}
