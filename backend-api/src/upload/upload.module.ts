import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { MulterModule } from '@nestjs/platform-express';
import { mkdirSync } from 'fs';

// Ensure upload directory exists
try { mkdirSync('./public/uploads', { recursive: true }); } catch {}

@Module({
  imports: [MulterModule.register({ dest: './public/uploads' })],
  controllers: [UploadController],
})
export class UploadModule {}
