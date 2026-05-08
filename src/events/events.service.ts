import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { DatabaseService } from 'src/database/database.service';


@Injectable()
export class EventsService {

  constructor(private readonly prisma: DatabaseService) {}
  async create(companyId: string, createEventDto: Prisma.EventCreateInput) {
    return await this.prisma.event.create({ data: { ...createEventDto, organiser: { connect: { id: companyId } } } });
  }

  async findAll(companyId: string) {
    return await this.prisma.event.findMany({ where: { organiser: { id: companyId } } });
  }

  async findOne(id: string) {
    return await this.prisma.event.findUnique({ where: { id } });
  }

  async update(id: string, updateEventDto: Prisma.EventUpdateInput  ) {
    return await this.prisma.event.update({ where: { id }, data: updateEventDto });
  }

  async remove(id: string) {
    return await this.prisma.event.delete({ where: { id } });
  }
}
