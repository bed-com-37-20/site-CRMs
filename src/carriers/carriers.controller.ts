import { Controller, Get, Post, Body, Patch, Query, Delete } from '@nestjs/common';
import { CarriersService } from './carriers.service';
import { Prisma} from 'generated/prisma/client';

@Controller('carriers')
export class CarriersController {
  constructor(private readonly carriersService: CarriersService) {}

  @Post()
  async create(@Query('companyInfoId') companyInfoId: string, @Body() createCarrierDto: Prisma.CarrierCreateInput) {
    return await this.carriersService.create(companyInfoId, createCarrierDto);
  }

  @Get()
  async findAll(@Query('companyInfoId') companyInfoId: string) {
    return await this.carriersService.findAll(companyInfoId);
  }

  @Get(':id')
  async findOne(@Query('id') id: string) {
    return await this.carriersService.findOne(id);
  }

  @Patch(':id')
  async update(@Query('id') id: string, @Body() updateCarrierDto: Prisma.CarrierUpdateInput) {
    return await this.carriersService.update(id, updateCarrierDto);
  }

  @Delete(':id')
  async remove(@Query('id') id: string) {
    return await this.carriersService.remove(id);
  }
}
