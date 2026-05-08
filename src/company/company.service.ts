import { Injectable } from '@nestjs/common';
import {DatabaseService} from "../database/database.service";
import {Prisma} from "generated/prisma/client";
import { userInfo } from 'os';

@Injectable()
export class CompanyService {

  constructor(private readonly databaseService: DatabaseService) {}

  async create(userId: string, createCompanyDto: Prisma.CompanyInfoCreateInput) {
    return await this.databaseService.companyInfo.create({
      data: {
        ...createCompanyDto,
        owner: {connect: { id: userId } }
      },
    });
  }

  async findAll(userId: string) {
    return await this.databaseService.companyInfo.findMany({where: {owner: {id: userId}}});
  }

  async findOne(id: string) {
    return await this.databaseService.companyInfo.findUnique({ where: { id } });
  }

  async update(id: string, updateCompanyDto: Prisma.CompanyInfoUpdateInput) {
    return await this.databaseService.companyInfo.update({ where: { id }, data: updateCompanyDto });
  }

  async remove(id: string) {
    return await this.databaseService.companyInfo.delete({ where: { id } });
  }
}
