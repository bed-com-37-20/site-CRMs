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
  Response,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { Prisma } from 'generated/prisma/client';
import { AuthGuard } from 'src/app/guards/authGuard';

@ApiTags('Company')
@UseGuards(AuthGuard)
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  async create(
    @Body() createCompanyDto: Prisma.CompanyInfoCreateInput,
    @Request() req,
  ) {
    return await this.companyService.create(req.user.sub, createCompanyDto);
  }

  @Get()
  async findAll(@Request() req) {
    return await this.companyService.findAll(req.user.sub);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.companyService.findOne(id);
  }

  @Get(':id/logo')
  async getCompanyLogo(@Param('id') id: string, @Response() res) {
    try {
      const stream = await this.companyService.getLogoStream(id);
      res.set({
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      });
      stream.pipe(res);
    } catch (error) {
      throw new NotFoundException('Company logo not found');
    }
  }

  @Get(':id/cover-image')
  async getCompanyCoverImage(@Param('id') id: string, @Response() res) {
    try {
      const stream = await this.companyService.getCoverImageStream(id);
      res.set({
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      });
      stream.pipe(res);
    } catch (error) {
      throw new NotFoundException('Company cover image not found');
    }
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCompanyDto: Prisma.CompanyInfoUpdateInput,
  ) {
    return await this.companyService.update(id, updateCompanyDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.companyService.remove(id);
  }

  @Post(':id/upload-logo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.companyService.uploadLogo(id, file);
  }

  @Post(':id/upload-cover-image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCoverImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.companyService.uploadCoverImage(id, file);
  }

  @Post(':id/upload-file')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.companyService.uploadFile(id, file);
  }

  @Delete(':id/logo-delete')
  async deleteLogo(@Param('id') id: string) {
    return await this.companyService.deleteLogo(id);
  }

  @Delete(':id/cover-image-delete')
  async deleteCoverImage(@Param('id') id: string) {
    return await this.companyService.deleteCoverImage(id);
  }
}
