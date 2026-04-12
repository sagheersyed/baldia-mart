import { Controller, Post, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { S3StorageService } from './s3-storage.service';

@Controller('upload')
@UseGuards(AuthGuard('jwt'))
export class UploadController {
  constructor(private readonly s3StorageService: S3StorageService) { }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: any) {
    // If using multer-s3, file.location is the URL. Otherwise we use local host.
    const host = process.env.BACKEND_URL || 'https://9090-175-107-236-228.ngrok-free.app';
    const url = file.location || `${host}/uploads/${file.filename}`;

    return {
      url,
      filename: file.filename || file.key,
    };
  }
}
