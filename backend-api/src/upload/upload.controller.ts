import { Controller, Post, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AuthGuard } from '@nestjs/passport';
import { v4 as uuidv4 } from 'uuid';

@Controller('upload')
@UseGuards(AuthGuard('jwt'))
export class UploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './public/uploads',
        filename: (_req, file, cb) => {
          const uniqueSuffix = uuidv4();
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (_req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
        if (!file.originalname.match(allowed)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    const host = process.env.BACKEND_URL || 'http://localhost:3000';
    return {
      url: `${host}/uploads/${file.filename}`,
      filename: file.filename,
    };
  }
}
