import { Controller, Get, Post, Body, Patch, Query, Delete, Param } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Prisma } from 'generated/prisma/client';


@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  async create(
    @Body() createProductDto: Prisma.ProductCreateInput,
    @Query('id') companyId: string) 
  {
    return this.productsService.create(companyId, createProductDto);
  }

  @Get()
  async findAll(@Param('companyId') companyId: string) {
    return await this.productsService.findAll(companyId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.productsService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateProductDto: Prisma.ProductUpdateInput) {
    return await this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.productsService.remove(id);
  }
}
