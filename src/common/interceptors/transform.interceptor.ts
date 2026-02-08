import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response as ExpressResponse } from 'express';

export interface Response<T> {
  data: T;
  statusCode: number;
  timestamp: string;
  message?: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        const response = context.switchToHttp().getResponse<ExpressResponse>();
        const message =
          data && typeof data === 'object' && 'message' in data
            ? (data.message as string)
            : '';

        return {
          statusCode: response.statusCode,
          message: message || 'Success',
          timestamp: new Date().toISOString(),
          data,
        };
      }),
    );
  }
}
