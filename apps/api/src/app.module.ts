import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'path';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TasksModule } from './tasks/tasks.module';
import { ReferralsModule } from './referrals/referrals.module';
import { WalletModule } from './wallet/wallet.module';
import { PaymentModule } from './payment/payment.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(__dirname, '../../../.env'),
    }),

    // Rate limiting par paliers
    ThrottlerModule.forRoot([
      {
        name: 'short',   // Anti-burst : max 10 requêtes / seconde
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',  // Usage normal : max 60 requêtes / 10 secondes
        ttl: 10000,
        limit: 60,
      },
      {
        name: 'long',    // Limite globale : max 200 requêtes / minute
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
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
