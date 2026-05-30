import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, Get, Param, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Response } from 'express';
import { join } from 'path';

@Controller('uploads')
export class UploadsController {
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    // Return the relative path that can be accessed via /uploads/:filename
    return {
      url: `/uploads/${file.filename}`,
      filename: file.filename,
    };
  }

  @Get(':filename')
  async getFile(@Param('filename') filename: string, @Res() res: Response) {
    return res.sendFile(filename, { root: './uploads' });
  }
}
