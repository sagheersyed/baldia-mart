import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): string {
    return 'Hyperlocal Delivery API is running securely.';
  }
}
