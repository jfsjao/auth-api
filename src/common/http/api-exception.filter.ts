import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { ApplicationError, ErrorDetail } from '../errors/application.error';

interface ErrorPayload {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const normalized = this.normalize(exception);
    const requestId = request.header('x-request-id')?.trim() || randomUUID();

    response.status(normalized.statusCode).json({
      error: {
        code: normalized.code,
        message: normalized.message,
        ...(normalized.details ? { details: normalized.details } : {}),
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  private normalize(exception: unknown): {
    statusCode: number;
    code: string;
    message: string;
    details?: ErrorDetail[];
  } {
    if (exception instanceof ApplicationError) {
      return exception;
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const payload = exception.getResponse();
      const body: ErrorPayload =
        typeof payload === 'string' ? { message: payload } : payload;
      const messages = Array.isArray(body.message)
        ? body.message
        : body.message
          ? [body.message]
          : [];

      return {
        statusCode,
        code: statusCode === 400 ? 'VALIDATION_ERROR' : `HTTP_${statusCode}`,
        message:
          statusCode >= 500
            ? 'Erro interno do servidor'
            : messages[0] || exception.message,
        ...(messages.length > 1
          ? { details: messages.map((message) => ({ message })) }
          : {}),
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Erro interno do servidor',
    };
  }
}
