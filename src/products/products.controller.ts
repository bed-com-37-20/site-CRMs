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
  UploadedFile,
  Response,
  NotFoundException,
  Request,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { Prisma } from 'generated/prisma/client';
import { AuthGuard } from 'src/app/guards/authGuard';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(AuthGuard)
  async create(
    @Body() createProductDto: Prisma.ProductCreateInput,
    @Query('id') companyId: string,
    @Request() req,
  ) {
   //console.log('Creating product for companyId:', req.user.sub, 'with data:', createProductDto);
    return this.productsService.create(req.user.sub,companyId, createProductDto);
  }

  @Get()
  @UseGuards(AuthGuard)
  async findAll(@Request() req,@Param() companyId: string ){
   //const companyId = req.user.sub;

    console.log('Fetching products for companyId:', companyId);
    return await this.productsService.findAll(companyId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.productsService.findOne(id);
  }

  @Get(':id/image')
  async getProductImage(@Param('id') id: string, @Response() res) {
    try {
      const stream = await this.productsService.getProductImageStream(id);
      res.set({
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      });
      stream.pipe(res);
    } catch (error) {
      throw new NotFoundException('Product image not found');
    }
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: Prisma.ProductUpdateInput,
  ) {
    return await this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.productsService.remove(id);
  }

  @Post(':id/upload-image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProductImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.productsService.uploadProductImage(id, file);
  }

  @Delete(':id/image-delete')
  async deleteProductImage(@Param('id') id: string) {
    return await this.productsService.deleteProductImage(id);
  }
}
