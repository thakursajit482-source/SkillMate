import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

export interface ResponseEnvelope<T> {
  success: boolean;
  statusCode: number;
  data: T;
  timestamp: string;
  path: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ResponseEnvelope<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ResponseEnvelope<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest<Request>();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((data) => ({
        success: true,
        statusCode,
        data: data !== undefined ? data : null,
        timestamp: new Date().toISOString(),
        path: request.url,
      })),
    );
  }
}
