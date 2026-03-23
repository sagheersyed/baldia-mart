import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { GlobalHttpExceptionFilter } from './common/global-exception.filter';
import { LoggingInterceptor } from './common/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  
  // Apply Security Headers
  app.use(helmet({
    crossOriginResourcePolicy: false, // Allow loading images from different origins
  }));

  // Enable CORS
  app.enableCors();
  
  // Serve static files from public directory
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/public/',
  });

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
  
  await app.listen(3000, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();

