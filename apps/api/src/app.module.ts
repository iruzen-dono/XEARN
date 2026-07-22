import { Module, Injectable, ExecutionContext } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { resolve } from 'path';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import { createKeyv } from '@keyv/redis';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TasksModule } from './tasks/tasks.module';
import { ReferralsModule } from './referrals/referrals.module';
import { WalletModule } from './wallet/wallet.module';
import { PaymentModule } from './payment/payment.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdsModule } from './ads/ads.module';
import { GamificationModule } from './gamification/gamification.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AdminModule } from './admin/admin.module';
import { HealthController } from './health.controller';
import { CleanupCronService } from './common/cleanup.cron';

@Injectable()
class ProxyAwareThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    return Promise.resolve(ip);
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    // Don't rate-limit health checks
    if (req.path === '/api/health') return true;
    return false;
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(__dirname, '../../../.env'),
    }),

    ScheduleModule.forRoot(),

    EventEmitterModule.forRoot(),

    // Cache Redis (fallback mémoire si REDIS_URL non défini)
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: (config: ConfigService): Record<string, any> => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (redisUrl) {
          return {
            stores: [createKeyv(redisUrl)],
            ttl: 60_000, // 60s TTL par défaut
          };
        }
        // Fallback in-memory
        return { ttl: 60_000 };
      },
      inject: [ConfigService],
    }),

    // Rate limiting par paliers
    ThrottlerModule.forRoot([
      {
        name: 'short', // Anti-burst : max 10 requêtes / seconde
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium', // Usage normal : max 60 requêtes / 10 secondes
        ttl: 10000,
        limit: 60,
      },
      {
        name: 'long', // Limite globale : max 200 requêtes / minute
        ttl: 60000,
        limit: 200,
      },
    ]),

    PrismaModule,
    AuthModule,
    UsersModule,
    TasksModule,
    ReferralsModule,
    WalletModule,
    PaymentModule,
    NotificationsModule,
    AdsModule,
    GamificationModule,
    AnalyticsModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ProxyAwareThrottlerGuard,
    },
    CleanupCronService,
  ],
})
export class AppModule {}
