import { Global, Module} from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { MinioModule } from '../minio/minio.module';
import { FilesService } from 'src/files/files.service';

@Global()
@Module({
  imports: [MinioModule],
  controllers: [CompanyController],
  providers: [CompanyService,FilesService],
  exports: [CompanyService],
})
export class CompanyModule {}
