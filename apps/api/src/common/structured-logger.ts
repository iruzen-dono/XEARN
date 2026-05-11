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
    if (this.isProduction) {
      const entry: Record<string, unknown> = {
        timestamp: new Date().toISOString(),
        level,
        context: context || 'App',
        message: this.formatMessage(message),
      };
      if (trace) entry.trace = trace;
      // JSON-line output (compatible with ELK/CloudWatch/Datadog)
      process.stdout.write(JSON.stringify(entry) + '\n');
    } else {
      // Human-readable dev output
      const ctx = context ? `[${context}]` : '';
      const ts = new Date().toLocaleTimeString();
      const levelUpper = level.toUpperCase().padEnd(7);
      const out = `${ts} ${levelUpper} ${ctx} ${this.formatMessage(message)}`;

      switch (level) {
        case 'error':
          console.error(out);
          if (trace) console.error(trace);
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
}
