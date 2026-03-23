import { Controller, Post, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { S3StorageService } from './s3-storage.service';

@Controller('upload')
@UseGuards(AuthGuard('jwt'))
export class UploadController {
  constructor(private readonly s3StorageService: S3StorageService) { }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', ({
      // We pass an empty object here because the interceptor needs it, 
      // but we will override its behavior by manually configuring the storage
    })),
  )
  async uploadFile(@UploadedFile() file: any) {
    // If using multer-s3, file.location is the URL. Otherwise we use local host.
    const host = process.env.BACKEND_URL || 'http://192.168.100.142:3000';
    const url = file.location || `${host}/uploads/${file.filename}`;

    return {
      url,
      filename: file.filename || file.key,
    };
  }
}
