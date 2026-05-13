import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { MinioService } from 'src/minio/minio.service';
import { v4 as uuid } from 'uuid';
import { CompanyService } from '../company/company.service';  

@Injectable()
export class ProductsService {
  private readonly bucketName = 'products';

  constructor(
    private readonly prisma: DatabaseService,
    private readonly minioService: MinioService,
    private readonly companyService: CompanyService
  ) {}

  async create(
    userId: string,
    companyId: string,
    createProductDto: Prisma.ProductCreateInput,
  ) {
    return await this.prisma.product.create({
      data: {
        ...createProductDto,
        companyInfo: { connect: { id: companyId } }
      },
    });
  }

  async findAll(companyId: string) {
    return await this.prisma.product.findMany({
      where: { companyInfo: { id: companyId } },
    });
  }

  async findOne(id: string) {
    return await this.prisma.product.findUnique({ where: { id: id } });
  }

  async update(id: string, updateProductDto: Prisma.ProductUpdateInput) {
    return await this.prisma.product.update({
      where: { id: id },
      data: updateProductDto,
    });
  }

  async remove(id: string) {
    return await this.prisma.product.delete({ where: { id: id } });
  }

  /**
   * Upload an image for a product
   * @param productId - Product ID
   * @param file - File object from Express
   */
  async uploadProductImage(productId: string, file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file provided');
    }

    // Validate file is an image
    if (!file.mimetype.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Generate a unique filename
    const fileName = `${productId}/${uuid()}-${file.originalname}`;

    // Upload to MinIO
    await this.minioService.uploadFile(
      this.bucketName,
      fileName,
      file.buffer,
      file.mimetype,
    );

    // Store just the file path (not presigned URL) to avoid signature expiration
    const imageUrl = fileName;

    // Update product with image URL
    return await this.prisma.product.update({
      where: { id: productId },
      data: { imageUrl },
    });
  }

  /**
   * Delete a product image
   * @param productId - Product ID
   */
  async deleteProductImage(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.imageUrl) {
      throw new Error('Product or image not found');
    }

    // Delete from MinIO
    await this.minioService.deleteFile(this.bucketName, product.imageUrl);

    // Update product record
    return await this.prisma.product.update({
      where: { id: productId },
      data: { imageUrl: null },
    });
  }

  /**
   * Get product image stream
   * @param productId - Product ID
   */
  async getProductImageStream(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.imageUrl) {
      throw new Error('Product or image not found');
    }

    // Get file stream from MinIO
    return await this.minioService.getFileStream(
      this.bucketName,
      product.imageUrl,
    );
  }
}
