import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { GlobalHttpExceptionFilter } from './common/global-exception.filter';
import { LoggingInterceptor } from './common/logging.interceptor';
import { getAllowedOrigins, isOriginAllowed } from './common/cors';

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  
  // Apply Security Headers
  app.use(helmet({
    crossOriginResourcePolicy: false, // Allow loading images from different origins
  }));

  // Enable CORS with strict allowlist (set ALLOWED_ORIGINS in env)
  const allowedOrigins = getAllowedOrigins();
  app.enableCors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('CORS origin denied'));
    },
    credentials: true,
  });
  
  // Serve static files from public directory
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // Global Prefix for API endpoints
  app.setGlobalPrefix('api/v1');

  // Global Validation Pipe — strips unknown fields & validates DTOs automatically
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,        // strip properties not in DTO
    forbidNonWhitelisted: false, // soft mode — don't error on extra fields (safer for mobile)
    transform: true,        // auto-transform payloads to DTO instances
  }));

  // Global Exception Filter — ensures all errors return consistent JSON shape
  app.useGlobalFilters(new GlobalHttpExceptionFilter());
  
  // Global Logging Interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());
  
  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Baldia-Mart API')
    .setDescription('The complete API documentation for Baldia-Mart hyperlocal platform.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  // Swagger will be served at http://localhost:3000/docs
  SwaggerModule.setup('docs', app, document);

  await app.listen(3000, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Swagger Docs available at: ${await app.getUrl()}/docs`);
  console.log(`Allowed CORS origins: ${allowedOrigins.join(', ')}`);
}
bootstrap();

