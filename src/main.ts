import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS for file uploads
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE'
  }  );

  // Serve static files from public folder
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // Swagger documentation setup
  const config = new DocumentBuilder()
    .setTitle('TAPI Server API')
    .setDescription('Complete API documentation for TAPI Server with all endpoints and models')
    .setVersion('1.0.0')
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Products', 'Product management endpoints')
    .addTag('Company', 'Company information endpoints')
    .addTag('Events', 'Event management endpoints')
    .addTag('Carriers', 'Carrier management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
