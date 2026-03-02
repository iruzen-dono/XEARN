import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaymentProvider,
  PaymentCollectionRequest,
  PaymentCollectionResult,
  PaymentDisbursementRequest,
  PaymentDisbursementResult,
} from './payment-provider.interface';

/**
 * Fournisseur FedaPay — Paiements réels en zone FCFA.
 *
 * Supporte : MTN MoMo, Moov Money (Flooz), TMoney, Orange Money, Visa/Mastercard.
 *
 * Documentation : https://docs.fedapay.com
 *
 * Variables .env requises :
 *   FEDAPAY_SECRET_KEY   — Clé secrète (sandbox ou live)
 *   FEDAPAY_PUBLIC_KEY   — Clé publique
 *   FEDAPAY_ENV          — "sandbox" ou "live"
 *   FEDAPAY_CALLBACK_URL — URL de callback webhook
 */
@Injectable()
export class FedaPayProvider implements PaymentProvider {
  private readonly logger = new Logger('FedaPayProvider');
  readonly name = 'fedapay';

  private readonly apiBase: string;
  private readonly secretKey: string;
  private readonly callbackUrl: string;

  constructor(private configService: ConfigService) {
    const env = this.configService.get('FEDAPAY_ENV') || 'sandbox';
    this.apiBase =
      env === 'live' ? 'https://api.fedapay.com/v1' : 'https://sandbox-api.fedapay.com/v1';
    this.secretKey = this.configService.get('FEDAPAY_SECRET_KEY') || '';
    this.callbackUrl = this.configService.get('FEDAPAY_CALLBACK_URL') || '';

    if (!this.secretKey) {
      this.logger.warn('FEDAPAY_SECRET_KEY non définie — les paiements réels échoueront');
    }
  }

  /**
   * Créer une transaction de collecte et retourner l'URL de paiement.
   * L'utilisateur sera redirigé vers la page FedaPay pour payer.
   */
  async collect(request: PaymentCollectionRequest): Promise<PaymentCollectionResult> {
    try {
      // 1. Créer la transaction
      const txResponse = await this.apiRequest('POST', '/transactions', {
        description: request.description,
        amount: request.amount,
        currency: { iso: 'XOF' },
        callback_url: this.callbackUrl,
        customer: {
          email: request.customerEmail || 'client@xearn.com',
          firstname: request.customerName?.split(' ')[0] || 'Client',
          lastname: request.customerName?.split(' ').slice(1).join(' ') || 'XEARN',
          phone_number: { number: request.customerPhone || '' },
        },
        metadata: request.callbackMeta || {},
      });

      const transactionId = txResponse?.v1?.transaction?.id;
      if (!transactionId) {
        this.logger.error('FedaPay: pas de transaction ID dans la réponse', txResponse);
        return { status: 'failed', message: 'Erreur lors de la création du paiement' };
      }

      // 2. Générer le token de paiement (URL)
      const tokenResponse = await this.apiRequest(
        'POST',
        `/transactions/${transactionId}/token`,
        {},
      );
      const paymentUrl = tokenResponse?.v1?.token?.url || tokenResponse?.token;

      if (!paymentUrl) {
        this.logger.error("FedaPay: pas d'URL de paiement", tokenResponse);
        return { status: 'failed', message: 'Erreur lors de la génération du lien de paiement' };
      }

      this.logger.log(`FedaPay collecte créée: ${transactionId} — ${request.amount} FCFA`);
      return {
        status: 'pending',
        providerTransactionId: String(transactionId),
        paymentUrl,
        message: 'Redirection vers la page de paiement',
      };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('FedaPay collecte erreur:', err.message);
      return { status: 'failed', message: err.message || 'Erreur de paiement FedaPay' };
    }
  }

  /**
   * Envoyer de l'argent vers un numéro mobile money.
   */
  async disburse(request: PaymentDisbursementRequest): Promise<PaymentDisbursementResult> {
    try {
      const payoutResponse = await this.apiRequest('POST', '/payouts', {
        amount: request.amount,
        currency: { iso: 'XOF' },
        mode: this.mapMethodToFedaPay(request.method),
        customer: {
          firstname: request.recipientName?.split(' ')[0] || 'Client',
          lastname: request.recipientName?.split(' ').slice(1).join(' ') || 'XEARN',
          email: 'payout@xearn.com',
          phone_number: { number: request.accountInfo },
        },
      });

      const payoutId = payoutResponse?.v1?.payout?.id;
      if (!payoutId) {
        return { status: 'failed', message: 'Erreur lors de la création du décaissement' };
      }

      // Lancer le paiement
      await this.apiRequest('PUT', `/payouts/${payoutId}/start`, {});

      this.logger.log(
        `FedaPay décaissement lancé: ${payoutId} — ${request.amount} FCFA → ${request.accountInfo}`,
      );
      return {
        status: 'pending',
        providerTransactionId: String(payoutId),
        message: 'Décaissement en cours de traitement',
      };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('FedaPay décaissement erreur:', err.message);
      return { status: 'failed', message: err.message || 'Erreur de décaissement FedaPay' };
    }
  }

  /**
   * Vérifier le statut d'une transaction FedaPay.
   */
  async checkStatus(providerTransactionId: string): Promise<'completed' | 'pending' | 'failed'> {
    try {
      const response = await this.apiRequest('GET', `/transactions/${providerTransactionId}`, null);
      const status = response?.v1?.transaction?.status;

      switch (status) {
        case 'approved':
          return 'completed';
        case 'transferred':
          return 'completed';
        case 'pending':
          return 'pending';
        case 'started':
          return 'pending';
        default:
          return 'failed';
      }
    } catch {
      return 'failed';
    }
  }

  // ──── Helpers ────

  private mapMethodToFedaPay(method: string): string {
    const map: Record<string, string> = {
      MTN_MOMO: 'mtn',
      FLOOZ: 'moov',
      TMONEY: 'togocom',
      ORANGE_MONEY: 'orange',
      MOBILE_MONEY: 'mtn', // Par défaut MTN
      BANK_TRANSFER: 'bank',
    };
    return map[method] || 'mtn';
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async apiRequest(
    method: string,
    path: string,
    body: Record<string, unknown> | null,
  ): Promise<any> {
    const url = `${this.apiBase}${path}`;
    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FedaPay API ${method} ${path}: ${response.status} — ${errorText}`);
    }

    return response.json();
  }
}
