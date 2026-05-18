import { LoggerService, LogLevel } from '@nestjs/common';

/**
 * StructuredLogger — outputs JSON lines in production for machine-parseable logs.
 * Falls back to standard colored console output in development.
 *
 * Usage: NestFactory.create(AppModule, { logger: new StructuredLogger() })
 */
export class StructuredLogger implements LoggerService {
  private readonly isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  log(message: unknown, context?: string) {
    this.emit('log', message, context);
  }

  error(message: unknown, trace?: string, context?: string) {
    this.emit('error', message, context, trace);
  }

  warn(message: unknown, context?: string) {
    this.emit('warn', message, context);
  }

  debug(message: unknown, context?: string) {
    this.emit('debug', message, context);
  }

  verbose(message: unknown, context?: string) {
    this.emit('verbose', message, context);
  }

  setLogLevels(_levels: LogLevel[]) {
    // No-op — NestJS manages log levels
  }

  private emit(level: string, message: unknown, context?: string, trace?: string) {
    // MAJEUR FIX #8: Sanitize sensitive data before logging
    const sanitizedMessage = this.sanitizeSensitiveData(this.formatMessage(message));
    const sanitizedTrace = trace ? this.sanitizeSensitiveData(trace) : undefined;

    if (this.isProduction) {
      const entry: Record<string, unknown> = {
        timestamp: new Date().toISOString(),
        level,
        context: context || 'App',
        message: sanitizedMessage,
      };
      if (sanitizedTrace) entry.trace = sanitizedTrace;
      // JSON-line output (compatible with ELK/CloudWatch/Datadog)
      process.stdout.write(JSON.stringify(entry) + '\n');
    } else {
      // Human-readable dev output
      const ctx = context ? `[${context}]` : '';
      const ts = new Date().toLocaleTimeString();
      const levelUpper = level.toUpperCase().padEnd(7);
      const out = `${ts} ${levelUpper} ${ctx} ${sanitizedMessage}`;

      switch (level) {
        case 'error':
          console.error(out);
          if (sanitizedTrace) console.error(sanitizedTrace);
          break;
        case 'warn':
          console.warn(out);
          break;
        default:
          console.log(out);
      }
    }
  }

  private formatMessage(message: unknown): string {
    if (typeof message === 'string') return message;
    try {
      const serialized = JSON.stringify(message);
      return serialized ?? String(message);
    } catch {
      return String(message);
    }
  }

  /**
   * MAJEUR FIX #8: Sanitize sensitive data from log messages
   *
   * Redacts:
   * - JWT tokens (Bearer eyJ...)
   * - Passwords (password: "...")
   * - Phone numbers (keep first 3 and last 2 digits)
   * - API keys and secrets
   * - Credit card numbers
   * - Session tokens
   */
  private sanitizeSensitiveData(message: string): string {
    return (
      message
        // JWT tokens: Bearer eyJhbGc... → Bearer [REDACTED]
        .replace(/Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g, 'Bearer [REDACTED]')
        // Passwords in JSON or query strings: password":"value" → password":"[REDACTED]"
        .replace(/(['"]?)password\1\s*[=:]\s*(['"])[^'"]+\2/gi, '$1password$1$2[REDACTED]$2')
        // API keys: secretKey=abc123... → secretKey=[REDACTED]
        .replace(
          /(secret|api[_-]?key|token|auth[_-]?key)(['"]?\s*[=:]\s*['"]?)[^\s&"']+/gi,
          '$1$2[REDACTED]',
        )
        // Phone numbers: +225XXXXXX78 → +225******78
        .replace(/(\+\d{3})\d{6}(\d{2})/g, '$1******$2')
        // Credit card numbers: 1234567890123456 → ************3456
        .replace(/\b\d{13,16}\b/g, (match) => '*'.repeat(match.length - 4) + match.slice(-4))
        // Session/refresh tokens (long alphanumeric strings > 32 chars)
        .replace(/\b[A-Za-z0-9]{32,}\b/g, '[TOKEN_REDACTED]')
    );
  }
}
