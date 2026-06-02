import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UploadController } from './upload.controller';
import { S3StorageService } from './s3-storage.service';

@Module({
  imports: [
    MulterModule.registerAsync({
      imports: [UploadModule],
      useFactory: (s3StorageService: S3StorageService) => s3StorageService.getMulterOptions(),
      inject: [S3StorageService],
    }),
  ],
  controllers: [UploadController],
  providers: [S3StorageService],
  exports: [S3StorageService],
})
export class UploadModule { }
