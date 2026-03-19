import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UploadController } from './upload.controller';
import { S3StorageService } from './s3-storage.service';

@Module({
  imports: [MulterModule.register({})],
  controllers: [UploadController],
  providers: [S3StorageService],
  exports: [S3StorageService],
})
export class UploadModule {}
