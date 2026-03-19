import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'An unexpected error occurred. Please try again.';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exRes = exception.getResponse();

      if (typeof exRes === 'string') {
        message = exRes;
      } else if (typeof exRes === 'object' && exRes !== null) {
        const resObj = exRes as any;
        message = resObj.message ?? message;
        error = resObj.error ?? error;
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
      message = exception.message || message;
    }

    // Always ensure message is a single string for mobile clients
    const flatMessage = Array.isArray(message) ? message.join('; ') : message;

    response.status(status).json({
      statusCode: status,
      error,
      message: flatMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
