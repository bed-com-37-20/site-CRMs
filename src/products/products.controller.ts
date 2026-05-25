// src/modules/products/products.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Response,
  NotFoundException,
  Request,
  UseGuards,
  BadRequestException,
  HttpStatus,
  HttpCode,
  Query,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { Prisma } from 'generated/prisma/client';
import { AuthGuard } from 'src/app/guards/authGuard';
// import { Response as ExpressResponse } from 'express';
import { fileUploadConfig } from '../../file-upload.config';


@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  async create(
    @Body() createProductDto: Prisma.ProductCreateInput,
    @Query('companyId') companyId: string,
    @Request() req,
  ) {
    if (!companyId) {
      throw new BadRequestException('Company ID is required');
    }
    return this.productsService.create(req.user.sub, companyId, createProductDto);
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get all products for a company' })
  @ApiQuery({ name: 'companyId', required: true, type: String })
  async findAll(@Query('companyId') companyId: string) {
    if (!companyId) {
      throw new BadRequestException('Company ID is required');
    }
    return await this.productsService.findAll(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  async findOne(@Param('id') id: string) {
    return await this.productsService.findOne(id);
  }

  @Get(':id/image')
  @ApiOperation({ summary: 'Get product image' })
  async getProductImage(@Param('id') id: string, @Response() res) {
    try {
      const stream = await this.productsService.getProductImageStream(id);
      res.set({
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      });
      stream.pipe(res);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Product image not found');
    }
  }

  @Get(':id/image-url')
  @ApiOperation({ summary: 'Get product image URL' })
  async getProductImageUrl(@Param('id') id: string) {
    const url = await this.productsService.getProductImageUrl(id);
    return { url };
  }

  @Get(':id/files')
  @ApiOperation({ summary: 'Get all files for a product' })
  async getAllFiles(@Param('id') id: string) {
    return await this.productsService.getAllProductFiles(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update product' })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: Prisma.ProductUpdateInput,
  ) {
    return await this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete product' })
  async remove(@Param('id') id: string) {
    await this.productsService.remove(id);
  }

  @Post(':id/upload-image')
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
  @ApiOperation({ summary: 'Upload product image' })
  async uploadProductImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return await this.productsService.uploadProductImage(id, file);
  }

  @Post(':id/update-image')
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
  @ApiOperation({ summary: 'Update product image' })
  async updateProductImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return await this.productsService.updateProductImage(id, file);
  }

  @Post(':id/upload-multiple-images')
  @UseInterceptors(FilesInterceptor('files', 10, fileUploadConfig))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload multiple product images' })
  async uploadMultipleProductImages(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }
    return await this.productsService.uploadMultipleProductImages(id, files);
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
          description: 'Optional field name for the file',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a generic file for product' })
  async uploadFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('fieldName') fieldName?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return await this.productsService.uploadProductFile(id, file, fieldName);
  }

  @Delete(':id/image')
  @ApiOperation({ summary: 'Delete product image' })
  async deleteProductImage(@Param('id') id: string) {
    return await this.productsService.deleteProductImage(id);
  }

  @Delete(':id/files/:fieldName')
  @ApiOperation({ summary: 'Delete a specific file by field name' })
  async deleteFileByField(
    @Param('id') id: string,
    @Param('fieldName') fieldName: string,
  ) {
    return await this.productsService.deleteProductFileByField(id, fieldName);
  }
}