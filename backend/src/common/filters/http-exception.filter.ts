import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorResponseBody {
  status: 'error';
  message: string;
  code: string;
  details: Record<string, unknown> | unknown[];
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, body } = this.normalizeException(exception);

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${statusCode}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(statusCode).json(body);
  }

  private normalizeException(exception: unknown): {
    statusCode: number;
    body: ErrorResponseBody;
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        return {
          statusCode,
          body: {
            status: 'error',
            message: exceptionResponse,
            code: HttpStatus[statusCode] ?? 'HTTP_EXCEPTION',
            details: {},
          },
        };
      }

      const responseObject = exceptionResponse as Record<string, unknown>;
      const message = this.extractMessage(responseObject, exception.message);
      const code =
        typeof responseObject.code === 'string'
          ? responseObject.code
          : HttpStatus[statusCode] ?? 'HTTP_EXCEPTION';
      const details =
        responseObject.details && typeof responseObject.details === 'object'
          ? (responseObject.details as Record<string, unknown>)
          : this.extractValidationDetails(responseObject);

      return {
        statusCode,
        body: {
          status: 'error',
          message,
          code,
          details,
        },
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        status: 'error',
        message: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
        details: {},
      },
    };
  }

  private extractMessage(
    responseObject: Record<string, unknown>,
    fallback: string,
  ): string {
    const message = responseObject.message;

    if (typeof message === 'string') {
      return message;
    }

    if (Array.isArray(message) && message.length > 0) {
      return message.map(String).join('; ');
    }

    return fallback;
  }

  private extractValidationDetails(
    responseObject: Record<string, unknown>,
  ): Record<string, unknown> | unknown[] {
    if (Array.isArray(responseObject.message)) {
      return { errors: responseObject.message };
    }

    return {};
  }
}
