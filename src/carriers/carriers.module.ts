import { Module } from '@nestjs/common';
import { CarriersService } from './carriers.service';
import { CarriersController } from './carriers.controller';
import { MinioModule } from '../minio/minio.module';
import { FilesService } from 'src/files/files.service';
import { CompanyService } from 'src/company/company.service';

@Module({
  imports: [],
  controllers: [CarriersController],
  providers: [CarriersService,FilesService,CompanyService]
})
export class CarriersModule {}
