import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider } from './payment-provider.interface';
import { MockPaymentProvider } from './mock-payment.provider';
import { FedaPayProvider } from './fedapay.provider';

/**
 * Service central de paiement.
 * Sélectionne automatiquement le bon provider selon PAYMENT_MODE.
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger('PaymentService');
  private readonly provider: PaymentProvider;

  constructor(
    private configService: ConfigService,
    private mockProvider: MockPaymentProvider,
    private fedapayProvider: FedaPayProvider,
  ) {
    const mode = this.configService.get('PAYMENT_MODE') || 'mock';

    if (mode === 'fedapay' || mode === 'live') {
      this.provider = this.fedapayProvider;
    } else {
      this.provider = this.mockProvider;
    }

    this.logger.log(`Payment provider actif: ${this.provider.name} (PAYMENT_MODE=${mode})`);
  }

  getProvider(): PaymentProvider {
    return this.provider;
  }

  getProviderName(): string {
    return this.provider.name;
  }
}
