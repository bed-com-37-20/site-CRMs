import { Injectable } from '@nestjs/common';
import {Prisma} from "generated/prisma/client";
import { DatabaseService } from '../database/database.service';

@Injectable()
export class CarriersService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(companyInfoId: string, createCarrierDto: Prisma.CarrierCreateInput) {
    return await this.databaseService.carrier.create({ data: { ...createCarrierDto, companyInfo: { connect: { id: companyInfoId } } } });
  }

  async findAll(companyInfoId: string) {
    return await this.databaseService.carrier.findMany({where: {companyInfo: {id: companyInfoId}}});
  } 
  

  async findOne(id: string) {
    return await this.databaseService.carrier.findUnique({ where: { id} });
  }

  async update(id: string, updateCarrierDto: Prisma.CarrierUpdateInput) {
    return await this.databaseService.carrier.update({ where: { id }, data: updateCarrierDto });  
  }

  async remove(id: string) {
    return await this.databaseService.carrier.delete({ where: { id } });
  }
}
