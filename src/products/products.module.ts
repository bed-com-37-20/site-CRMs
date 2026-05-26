import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { MinioModule } from '../minio/minio.module';
import { CompanyService } from 'src/company/company.service';
import { FilesService } from 'src/files/files.service';

@Module({
  imports: [MinioModule],
  controllers: [ProductsController],
  providers: [ProductsService,CompanyService,FilesService],
})
export class ProductsModule {}
