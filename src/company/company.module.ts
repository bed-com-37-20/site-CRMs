import { Global, Module} from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { MinioModule } from '../minio/minio.module';

@Global()
@Module({
  imports: [MinioModule],
  controllers: [CompanyController],
  providers: [CompanyService],
  exports: [CompanyService],
})
export class CompanyModule {}
