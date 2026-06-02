import { Injectable, Logger } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import * as multer from 'multer';
import * as multerS3 from 'multer-s3';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';

@Injectable()
export class S3StorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private s3: S3Client;

  constructor() {
    this.s3 = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: (process.env.AWS_ACCESS_KEY_ID as string) || 'dummy',
        secretAccessKey: (process.env.AWS_SECRET_ACCESS_KEY as string) || 'dummy',
      },
    });
  }

  getMulterOptions() {
    const bucket = process.env.AWS_S3_BUCKET;

    if (!bucket || !process.env.AWS_ACCESS_KEY_ID) {
      this.logger.warn('AWS S3 config missing. Falling back to local disk storage.');
      return {
        storage: multer.diskStorage({
          destination: './public/uploads',
          filename: (_req, file, cb) => {
            const uniqueSuffix = uuidv4();
            cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
          },
        }),
      };
    }

    return {
      storage: multerS3({
        s3: this.s3,
        bucket: bucket,
        acl: 'public-read',
        metadata: (_req, file, cb) => {
          cb(null, { fieldName: file.fieldname });
        },
        key: (_req, file, cb) => {
          const uniqueSuffix = uuidv4();
          cb(null, `uploads/${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    };
  }
}
