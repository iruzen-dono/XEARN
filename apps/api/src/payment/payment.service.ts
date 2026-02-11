import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider } from './payment-provider.interface';
import { MockPaymentProvider } from './mock-payment.provider';
import { FedaPayProvider } from './fedapay.provider';
import { FlutterwaveProvider } from './flutterwave.provider';

/**
 * Service central de paiement.
 * Sélectionne automatiquement le bon provider selon PAYMENT_MODE.
 *
 * PAYMENT_MODE=mock         → MockPaymentProvider (dev)
 * PAYMENT_MODE=flutterwave  → FlutterwaveProvider (production recommandé)
 * PAYMENT_MODE=fedapay      → FedaPayProvider (alternative)
 * PAYMENT_MODE=live         → FlutterwaveProvider (alias)
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger('PaymentService');
  private readonly provider: PaymentProvider;

  constructor(
    private configService: ConfigService,
    private mockProvider: MockPaymentProvider,
    private fedapayProvider: FedaPayProvider,
    private flutterwaveProvider: FlutterwaveProvider,
  ) {
    const mode = this.configService.get('PAYMENT_MODE') || 'mock';

    if (mode === 'flutterwave' || mode === 'live') {
      this.provider = this.flutterwaveProvider;
    } else if (mode === 'fedapay') {
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
