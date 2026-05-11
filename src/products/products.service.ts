import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class ProductsService {

  constructor(private readonly prisma: DatabaseService) {}

 async create(companyId: string, createProductDto: Prisma.ProductCreateInput) {
    return await this.prisma.product.create({ data: { ...createProductDto, companyInfo: { connect: { id: companyId } } } });
  }

  async findAll(companyId: string) {
    return await this.prisma.product.findMany({where: { companyInfo: { id: companyId } } });
  }

  async findOne(id: string) {
    return await this.prisma.product.findUnique({ where: { id: id } });
  }

  async update(id: string, updateProductDto: Prisma.ProductUpdateInput) {
    return await this.prisma.product.update({ where: { id: id }, data: updateProductDto });
  }

  async remove(id: string) {
    return await this.prisma.product.delete({ where: { id: id } });
  }
}
