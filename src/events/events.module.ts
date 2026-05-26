import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { MinioModule } from '../minio/minio.module';
import { FilesService } from 'src/files/files.service';
import { CompanyService } from 'src/company/company.service';

@Module({
  imports: [MinioModule],
  controllers: [EventsController],
  providers: [EventsService,FilesService,CompanyService],
})
export class EventsModule {}
