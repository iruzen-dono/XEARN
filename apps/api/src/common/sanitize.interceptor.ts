import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, map } from 'rxjs';

/**
 * SanitizeInterceptor — strips HTML tags from all string values in API responses.
 * This is a defense-in-depth measure to prevent stored XSS even if
 * DTO-level sanitization is accidentally skipped.
 */
@Injectable()
export class SanitizeInterceptor implements NestInterceptor {
  private static readonly MAX_DEPTH = 16;

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => this.sanitize(data, 0)));
  }

  private sanitize(value: unknown, depth: number): unknown {
    if (value === null || value === undefined) return value;
    // M6 fix: prevent stack overflow on deeply nested payloads
    if (depth >= SanitizeInterceptor.MAX_DEPTH) return value;
    if (typeof value === 'string') return value.replace(/<[^>]*>/g, '');
    if (Array.isArray(value)) return value.map((item) => this.sanitize(item, depth + 1));
    if (typeof value === 'object') {
      // Preserve special types: Date, Decimal (Prisma), Buffer, RegExp
      if (value instanceof Date) return value;
      const objectValue = value as {
        toFixed?: unknown;
        toString?: unknown;
        constructor?: { name?: string };
      };
      if (
        typeof objectValue.toFixed === 'function' &&
        typeof objectValue.toString === 'function' &&
        objectValue.constructor?.name === 'Decimal'
      )
        return value;
      if (Buffer.isBuffer(value)) return value;
      if (value instanceof RegExp) return value;
      const cleaned: Record<string, unknown> = {};
      for (const key of Object.keys(value)) {
        cleaned[key] = this.sanitize((value as Record<string, unknown>)[key], depth + 1);
      }
      return cleaned;
    }
    return value;
  }
}
