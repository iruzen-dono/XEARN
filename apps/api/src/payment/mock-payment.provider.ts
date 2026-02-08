import { Injectable, Logger } from '@nestjs/common';
import {
  PaymentProvider,
  PaymentCollectionRequest,
  PaymentCollectionResult,
  PaymentDisbursementRequest,
  PaymentDisbursementResult,
} from './payment-provider.interface';

/**
 * Fournisseur de paiement MOCK — pour le développement.
 * Toutes les opérations réussissent instantanément.
 */
@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  private readonly logger = new Logger('MockPaymentProvider');
  readonly name = 'mock';

  async collect(request: PaymentCollectionRequest): Promise<PaymentCollectionResult> {
    this.logger.log(`[MOCK] Collection: ${request.amount} FCFA — ${request.description}`);
    return {
      status: 'completed',
      providerTransactionId: `mock_col_${Date.now()}`,
      message: `Paiement mock de ${request.amount} FCFA réussi`,
    };
  }

  async disburse(request: PaymentDisbursementRequest): Promise<PaymentDisbursementResult> {
    this.logger.log(`[MOCK] Décaissement: ${request.amount} FCFA → ${request.method} (${request.accountInfo})`);
    return {
      status: 'completed',
      providerTransactionId: `mock_dis_${Date.now()}`,
      message: `Décaissement mock de ${request.amount} FCFA réussi`,
    };
  }

  async checkStatus(providerTransactionId: string): Promise<'completed' | 'pending' | 'failed'> {
    this.logger.log(`[MOCK] Vérification statut: ${providerTransactionId}`);
    return 'completed';
  }
}
