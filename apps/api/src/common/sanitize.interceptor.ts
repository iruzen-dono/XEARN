import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, map } from 'rxjs';

/**
 * SanitizeInterceptor — strips HTML tags from all string values in API responses.
 * This is a defense-in-depth measure to prevent stored XSS even if
 * DTO-level sanitization is accidentally skipped.
 */
@Injectable()
export class SanitizeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => this.sanitize(data)));
  }

  private sanitize(value: any): any {
    if (value === null || value === undefined) return value;
    if (typeof value === 'string') return value.replace(/<[^>]*>/g, '');
    if (Array.isArray(value)) return value.map((item) => this.sanitize(item));
    if (typeof value === 'object') {
      // Preserve special types: Date, Decimal (Prisma), Buffer, RegExp
      if (value instanceof Date) return value;
      if (typeof value.toFixed === 'function' && typeof value.toString === 'function' && value.constructor?.name === 'Decimal') return value;
      if (Buffer.isBuffer(value)) return value;
      if (value instanceof RegExp) return value;
      const cleaned: Record<string, any> = {};
      for (const key of Object.keys(value)) {
        cleaned[key] = this.sanitize(value[key]);
      }
      return cleaned;
    }
    return value;
  }
}
