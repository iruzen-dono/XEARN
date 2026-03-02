import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { PaymentModule } from '../payment/payment.module';
import { AuditLogService } from '../common/audit-log.service';

@Module({
  imports: [PaymentModule],
  controllers: [WalletController],
  providers: [WalletService, AuditLogService],
  exports: [WalletService],
})
export class WalletModule {}
