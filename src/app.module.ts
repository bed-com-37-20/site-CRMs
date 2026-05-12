import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { DatabaseModule } from './database/database.module';
import { UserModule } from './user/user.module';
import { ProductsModule } from './products/products.module';
import { CompanyModule } from './company/company.module';
import { EventsModule } from './events/events.module';
import { CarriersModule } from './carriers/carriers.module';
import { MinioModule } from './minio/minio.module';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
  }), DatabaseModule, MinioModule, UserModule, ProductsModule, CompanyModule, EventsModule, CarriersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
