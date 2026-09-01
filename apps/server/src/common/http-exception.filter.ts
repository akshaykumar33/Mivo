import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let errorMessage = 'An unexpected server error occurred';
    let errorDetails: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;

      if (typeof res === 'string') {
        errorMessage = res;
      } else if (typeof res === 'object' && res !== null) {
        errorCode = res.code || errorCode;
        errorMessage = res.message || errorMessage;
        errorDetails = res.details || (Array.isArray(res.message) ? res.message : undefined);
      }
    } else if (exception instanceof Error) {
      errorMessage = process.env.NODE_ENV === 'development' ? exception.message : errorMessage;
    }

    response.status(status).json({
      success: false,
      error: {
        code: errorCode,
        message: Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage,
        details: errorDetails,
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    });
  }
}
