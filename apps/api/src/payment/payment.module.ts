import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { MockPaymentProvider } from './mock-payment.provider';
import { FedaPayProvider } from './fedapay.provider';
import { PaymentWebhookController } from './payment-webhook.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentReconciliationService } from './payment-reconciliation.service';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentWebhookController],
  providers: [PaymentService, MockPaymentProvider, FedaPayProvider, PaymentReconciliationService],
  exports: [PaymentService],
})
export class PaymentModule {}
