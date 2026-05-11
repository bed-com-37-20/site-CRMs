import { Controller, Get, Post, Body, Patch, Delete, Param, UseGuards, Request } from '@nestjs/common';
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
async  create(
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
}
