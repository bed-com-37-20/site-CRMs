import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { CompanyService } from './company.service';
import {Prisma} from "generated/prisma/client";

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  create(@Body() createCompanyDto: Prisma.CompanyInfoCreateInput, @Query('userId') userId: string) {
    return this.companyService.create(userId, createCompanyDto);
  }

  @Get()
  findAll(@Query('userId') userId: string) {
    return this.companyService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.companyService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCompanyDto: Prisma.CompanyInfoUpdateInput) {
    return this.companyService.update(id, updateCompanyDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.companyService.remove(id);
  }
}
