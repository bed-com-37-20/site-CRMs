// src/modules/products/products.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { FilesService } from '../files/files.service';
import { EntityType } from '../files/dto/file.dto';
import { ReadStream } from 'fs';
import { CompanyService } from '../company/company.service';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: DatabaseService,
    private readonly fileService: FilesService,
    private readonly companyService: CompanyService,
  ) {}

  async create(
    userId: string,
    companyId: string,
    createProductDto: Prisma.ProductCreateInput,
  ) {
    // Verify company exists and belongs to user
    const company = await this.companyService.findOne(companyId);
    if (!company) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }

    return await this.prisma.product.create({
      data: {
        ...createProductDto,
        companyInfo: { connect: { id: companyId } },
      },
    });
  }

  async findAll(companyId: string) {
    return await this.prisma.product.findMany({
      where: { companyInfoId: companyId },
      include: {
        companyInfo: true,
      },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({ 
      where: { id },
      include: {
        companyInfo: true,
      },
    });
    
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    
    return product;
  }

  async update(id: string, updateProductDto: Prisma.ProductUpdateInput) {
    // Check if product exists
    await this.findOne(id);
    
    return await this.prisma.product.update({
      where: { id },
      data: updateProductDto,
    });
  }

  async remove(id: string) {
    // Check if product exists
    const product = await this.findOne(id);
    
    // First delete associated image if exists
    await this.fileService.deleteEntityFiles(EntityType.PRODUCT, id);
    
    // Then delete the product
    return await this.prisma.product.delete({ where: { id } });
  }

  /**
   * Upload an image for a product using FileService
   */
  async uploadProductImage(productId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file is an image
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }

    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    try {
      // Upload file using FileService
      const uploadedFile = await this.fileService.uploadFile(file, {
        entityType: EntityType.PRODUCT,
        entityId: productId,
        fieldName: 'imageUrl',
      });

      this.logger.log(`Product image uploaded successfully for product ${productId}`);
      
      return {
        message: 'Product image uploaded successfully',
        file: uploadedFile,
        product: await this.prisma.product.findUnique({
          where: { id: productId },
        }),
      };
    } catch (error) {
      this.logger.error(`Failed to upload product image: ${error}`);
      throw new BadRequestException(`Failed to upload product image: ${error}`);
    }
  }

  /**
   * Update product image (replace existing)
   */
  async updateProductImage(productId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file is an image
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }

    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Find existing product image
    const existingFile = await this.fileService.getFileByField(
      EntityType.PRODUCT,
      productId,
      'imageUrl',
    );

    try {
      let uploadedFile;
      
      if (existingFile) {
        // Update existing image
        uploadedFile = await this.fileService.updateFile(existingFile.id, {}, file);
        this.logger.log(`Product image updated successfully for product ${productId}`);
      } else {
        // Upload new image
        uploadedFile = await this.fileService.uploadFile(file, {
          entityType: EntityType.PRODUCT,
          entityId: productId,
          fieldName: 'imageUrl',
        });
        this.logger.log(`Product image uploaded successfully for product ${productId}`);
      }

      return {
        message: existingFile ? 'Product image updated successfully' : 'Product image uploaded successfully',
        file: uploadedFile,
        product: await this.prisma.product.findUnique({
          where: { id: productId },
        }),
      };
    } catch (error) {
      this.logger.error(`Failed to update product image: ${error}`);
      throw new BadRequestException(`Failed to update product image: ${error}`);
    }
  }

  /**
   * Delete product image
   */
  async deleteProductImage(productId: string) {
    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Find the product image file
    const productImage = await this.fileService.getFileByField(
      EntityType.PRODUCT,
      productId,
      'imageUrl',
    );

    if (!productImage) {
      throw new NotFoundException('Product image not found for this product');
    }

    try {
      // Delete the file
      await this.fileService.deleteFile(productImage.id);
      
      this.logger.log(`Product image deleted successfully for product ${productId}`);
      
      return {
        message: 'Product image deleted successfully',
        product: await this.prisma.product.findUnique({
          where: { id: productId },
        }),
      };
    } catch (error) {
      this.logger.error(`Failed to delete product image: ${error}`);
      throw new BadRequestException(`Failed to delete product image: ${error}`);
    }
  }

  /**
   * Get product image stream
   */
  async getProductImageStream(productId: string): Promise<ReadStream> {
    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Find the product image file
    const productImage = await this.fileService.getFileByField(
      EntityType.PRODUCT,
      productId,
      'imageUrl',
    );

    if (!productImage) {
      throw new NotFoundException('Product image not found for this product');
    }

    try {
      // Get file stream
      const { stream } = await this.fileService.getFileStream(productImage.id);
      return stream;
    } catch (error) {
      this.logger.error(`Failed to get product image stream: ${error}`);
      throw new NotFoundException('Failed to retrieve product image');
    }
  }

  /**
   * Get product image URL (if you need direct URL access)
   */
  async getProductImageUrl(productId: string): Promise<string | null> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const productImage = await this.fileService.getFileByField(
      EntityType.PRODUCT,
      productId,
      'imageUrl',
    );

    return productImage ? productImage.url : null;
  }

  /**
   * Get all files for a product
   */
  async getAllProductFiles(productId: string) {
    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    return await this.fileService.getFilesByEntity(EntityType.PRODUCT, productId);
  }

  /**
   * Upload a generic file for a product (e.g., additional images, documents)
   */
  async uploadProductFile(productId: string, file: Express.Multer.File, fieldName: string = 'attachment') {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    try {
      // Upload file using FileService
      const uploadedFile = await this.fileService.uploadFile(file, {
        entityType: EntityType.PRODUCT,
        entityId: productId,
        fieldName: fieldName,
      });

      this.logger.log(`File uploaded successfully for product ${productId}`);
      
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
   * Delete a specific file by field name
   */
  async deleteProductFileByField(productId: string, fieldName: string) {
    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const file = await this.fileService.getFileByField(
      EntityType.PRODUCT,
      productId,
      fieldName,
    );

    if (!file) {
      throw new NotFoundException(`File for field '${fieldName}' not found`);
    }

    try {
      await this.fileService.deleteFile(file.id);
      
      this.logger.log(`File ${fieldName} deleted successfully for product ${productId}`);
      
      return {
        message: `File '${fieldName}' deleted successfully`,
      };
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error}`);
      throw new BadRequestException(`Failed to delete file: ${error}`);
    }
  }

  /**
   * Bulk upload multiple product images
   */
  async uploadMultipleProductImages(productId: string, files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const uploadedFiles = [] as any;
    const errors = [] as any;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        if (!file.mimetype.startsWith('image/')) {
          throw new Error(`File ${file.originalname} is not an image`);
        }

        const uploadedFile = await this.fileService.uploadFile(file, {
          entityType: EntityType.PRODUCT,
          entityId: productId,
          fieldName: `imageUrl_${i + 1}`,
        });

        uploadedFiles.push(uploadedFile);
      } catch (error) {
        errors.push({ file: file.originalname, error: error });
      }
    }

    this.logger.log(`Uploaded ${uploadedFiles.length} images for product ${productId}`);

    return {
      message: `${uploadedFiles.length} files uploaded successfully`,
      uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}