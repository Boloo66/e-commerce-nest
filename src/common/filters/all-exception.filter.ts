import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { Prisma } from '@prisma/client';

/* eslint-disable */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private config: ConfigService) {}
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus ? exception.getStatus() : 500;

    response.status(status).json({
      statusCode: status,
      message: exception.message || 'Internal server error',
      timestamp: new Date().toISOString(),
      data: null,
      ...(this.config.get('NODE_ENV') === 'development' && {
        stack: exception.stack,
      }),
    });
  }
}

@Catch(Prisma.PrismaClientUnknownRequestError)
export class PrismaAllFilter implements ExceptionFilter {
  constructor(private config: ConfigService) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const status =
      exception instanceof Prisma.PrismaClientUnknownRequestError
        ? HttpStatus.BAD_REQUEST
        : HttpStatus.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      statusCode: status,
      message: exception.message || 'Internal server error',
      timestamp: new Date().toISOString(),
      data: null,
      ...(this.config.get('NODE_ENV') === 'development' && {
        stack: exception.stack,
      }),
    });
  }
}
