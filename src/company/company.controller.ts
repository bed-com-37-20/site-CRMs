// src/modules/company/company.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Res,
  NotFoundException,
  BadRequestException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { Prisma } from 'generated/prisma/client';
import { AuthGuard } from 'src/app/guards/authGuard';
import { Response } from 'express';
import {fileUploadConfig} from '../../file-upload.config'
@ApiTags('Company')
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Create a new company' })
  @ApiResponse({ status: 201, description: 'Company created successfully' })
  async create(
    @Body() createCompanyDto: Prisma.CompanyInfoCreateInput,
    @Request() req,
  ) {
    return await this.companyService.create(req.user.sub, createCompanyDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all companies' })
  async findAll() {
    return await this.companyService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company by ID' })
  async findOne(@Param('id') id: string) {
    return await this.companyService.findOne(id);
  }

  @Get(':id/logo')
  @ApiOperation({ summary: 'Get company logo' })
  async getCompanyLogo(@Param('id') id: string, @Res() res) {
    try {
      const stream = await this.companyService.getLogoStream(id);
      res.set({
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      });
      stream.pipe(res);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Company logo not found');
    }
  }

  @Get(':id/cover-image')
  @ApiOperation({ summary: 'Get company cover image' })
  async getCompanyCoverImage(@Param('id') id: string, @Res() res) {
    try {
      const stream = await this.companyService.getCoverImageStream(id);
      res.set({
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      });
      stream.pipe(res);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Company cover image not found');
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update company' })
  async update(
    @Param('id') id: string,
    @Body() updateCompanyDto: Prisma.CompanyInfoUpdateInput,
  ) {
    return await this.companyService.update(id, updateCompanyDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete company' })
  async remove(@Param('id') id: string) {
    await this.companyService.remove(id);
  }

  @Post(':id/upload-logo')
  @UseInterceptors(FileInterceptor('file', fileUploadConfig))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload company logo' })
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return await this.companyService.uploadLogo(id, file);
  }

  @Post(':id/upload-cover-image')
  @UseInterceptors(FileInterceptor('file', fileUploadConfig))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload company cover image' })
  async uploadCoverImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return await this.companyService.uploadCoverImage(id, file);
  }

  @Post(':id/upload-file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        fieldName: {
          type: 'string',
          description: 'Optional field name for the file'
       
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a generic file for company' })
  async uploadFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('fieldName') fieldName?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return await this.companyService.uploadFile(id, file, fieldName);
  }

  @Post(':id/update-logo')
  @UseInterceptors(FileInterceptor('file', fileUploadConfig))
  @ApiOperation({ summary: 'Update company logo' })
  async updateLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return await this.companyService.updateLogo(id, file);
  }

  @Delete(':id/logo')
  @ApiOperation({ summary: 'Delete company logo' })
  async deleteLogo(@Param('id') id: string) {
    return await this.companyService.deleteLogo(id);
  }

  @Delete(':id/cover-image')
  @ApiOperation({ summary: 'Delete company cover image' })
  async deleteCoverImage(@Param('id') id: string) {
    return await this.companyService.deleteCoverImage(id);
  }

  @Get(':id/files')
  @ApiOperation({ summary: 'Get all files for a company' })
  async getAllFiles(@Param('id') id: string) {
    return await this.companyService.getAllCompanyFiles(id);
  }

  @Get(':id/files/:fieldName')
  @ApiOperation({ summary: 'Get specific file by field name' })
  async getFileByField(
    @Param('id') id: string,
    @Param('fieldName') fieldName: string,
  ) {
    return await this.companyService.getCompanyFileByField(id, fieldName);
  }
}