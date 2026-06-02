import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private readonly logFile = path.join(process.cwd(), 'debug_logs.txt');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user } = request;
    const userRole = user?.role || 'anonymous';
    const userId = user?.id || 'none';

    const logMsg = `[${new Date().toISOString()}] Incoming: [${method}] ${url} | User: ${userId} (${userRole}) | Body: ${JSON.stringify(body)}`;
    this.logger.log(logMsg);
    
    try {
      fs.appendFileSync(this.logFile, logMsg + '\n');
    } catch (e) {}

    return next.handle().pipe(
      tap({
        error: (err) => {
          const errMsg = `[${new Date().toISOString()}] Failed: [${method}] ${url} | Error: ${err.message} | Status: ${err.status} | Stack: ${err.stack?.split('\n')[1]}`;
          this.logger.error(errMsg);
          try {
            fs.appendFileSync(this.logFile, errMsg + '\n');
          } catch (e) {}
        },
      }),
    );
  }
}
