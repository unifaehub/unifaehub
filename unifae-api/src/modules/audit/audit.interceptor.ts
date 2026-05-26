import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request } from 'express';
import { getRequestContext } from '../../common/http/request-context';
import { AuditService } from './audit.service';
import type { UserEntity } from '../../database/entities/user.entity';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { user?: UserEntity }>();
    const method = req.method?.toUpperCase?.() ?? '';
    const shouldAudit = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    if (!shouldAudit) return next.handle();

    const ctx = getRequestContext(req);
    const userId = req.user?.id ?? null;
    const entity = `${req.baseUrl || ''}${req.path || ''}` || 'http';

    return next.handle().pipe(
      tap({
        next: async () => {
          // entityId aqui é o próprio path (sem assumir retorno/DTO)
          await this.audit.log({
            userId,
            action: method,
            entity,
            entityId: req.originalUrl?.slice(0, 64) ?? entity.slice(0, 64),
            metadata: {
              query: req.query ?? null,
            },
            ctx,
          });
        },
      }),
    );
  }
}

