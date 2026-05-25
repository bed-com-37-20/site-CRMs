import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MinioModule } from '../minio/minio.module';
import { FilesService } from 'src/files/files.service';

@Module({
  imports: [MinioModule],
  controllers: [UserController],
  providers: [UserService,FilesService],
})
export class UserModule {}
