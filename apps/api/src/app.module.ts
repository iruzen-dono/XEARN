import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TasksModule } from './tasks/tasks.module';
import { ReferralsModule } from './referrals/referrals.module';
import { WalletModule } from './wallet/wallet.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),

    // Rate limiting global — 60 requêtes par minute par IP
    ThrottlerModule.forRoot([{
      name: 'default',
      ttl: 60000,
      limit: 60,
    }]),

    PrismaModule,
    AuthModule,
    UsersModule,
    TasksModule,
    ReferralsModule,
    WalletModule,
    PaymentModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
