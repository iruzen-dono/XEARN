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
 * Fournisseur Flutterwave — Paiements réels en Afrique (30+ pays).
 *
 * Supporte : MTN MoMo, M-Pesa, Orange Money, Airtel Money, Wave, Visa/Mastercard.
 *
 * Documentation : https://developer.flutterwave.com/docs
 *
 * Variables .env requises :
 *   FLW_SECRET_KEY    — Clé secrète (sandbox ou live)
 *   FLW_PUBLIC_KEY    — Clé publique
 *   FLW_ENCRYPTION_KEY — Clé de chiffrement
 *   FLW_WEBHOOK_HASH  — Hash secret pour valider les webhooks
 *   WEB_URL           — URL du frontend (pour la redirection après paiement)
 */
@Injectable()
export class FlutterwaveProvider implements PaymentProvider {
  private readonly logger = new Logger('FlutterwaveProvider');
  readonly name = 'flutterwave';

  private readonly apiBase = 'https://api.flutterwave.com/v3';
  private readonly secretKey: string;
  private readonly webUrl: string;

  constructor(private configService: ConfigService) {
    this.secretKey = this.configService.get('FLW_SECRET_KEY') || '';
    this.webUrl = this.configService.get('WEB_URL') || 'http://localhost:3000';

    if (!this.secretKey) {
      this.logger.warn('FLW_SECRET_KEY non définie — les paiements réels échoueront');
    }
  }

  /**
   * Créer un lien de paiement Flutterwave Standard.
   * L'utilisateur est redirigé vers la page Flutterwave pour payer.
   */
  async collect(request: PaymentCollectionRequest): Promise<PaymentCollectionResult> {
    try {
      const txRef = `xearn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const payload = {
        tx_ref: txRef,
        amount: request.amount,
        currency: 'XOF',
        redirect_url: `${this.webUrl}/dashboard?payment=success`,
        customer: {
          email: request.customerEmail || 'client@xearn.com',
          name: request.customerName || 'Client XEARN',
          phonenumber: request.customerPhone || '',
        },
        customizations: {
          title: 'XEARN',
          description: request.description,
          logo: `${this.webUrl}/logo.png`,
        },
        meta: {
          ...request.callbackMeta,
          tx_ref: txRef,
        },
      };

      const response = await this.apiRequest('POST', '/payments', payload);

      if (response?.status === 'success' && response?.data?.link) {
        this.logger.log(`Flutterwave collecte créée: ${txRef} — ${request.amount} FCFA`);
        return {
          status: 'pending',
          providerTransactionId: txRef,
          paymentUrl: response.data.link,
          message: 'Redirection vers la page de paiement Flutterwave',
        };
      }

      this.logger.error('Flutterwave: réponse inattendue', response);
      return { status: 'failed', message: response?.message || 'Erreur lors de la création du paiement' };
    } catch (error: any) {
      this.logger.error('Flutterwave collecte erreur:', error.message);
      return { status: 'failed', message: error.message || 'Erreur de paiement Flutterwave' };
    }
  }

  /**
   * Envoyer de l'argent vers un numéro mobile money via Flutterwave Transfer.
   */
  async disburse(request: PaymentDisbursementRequest): Promise<PaymentDisbursementResult> {
    try {
      const reference = `xearn_dis_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const payload = {
        account_bank: this.mapMethodToFlutterwave(request.method),
        account_number: request.accountInfo,
        amount: request.amount,
        currency: 'XOF',
        narration: `XEARN retrait — ${request.recipientName || 'Utilisateur'}`,
        reference,
        beneficiary_name: request.recipientName || 'Utilisateur XEARN',
        meta: request.callbackMeta || {},
      };

      const response = await this.apiRequest('POST', '/transfers', payload);

      if (response?.status === 'success') {
        const transferId = response?.data?.id;
        this.logger.log(`Flutterwave décaissement lancé: ${transferId} — ${request.amount} FCFA → ${request.accountInfo}`);
        return {
          status: 'pending',
          providerTransactionId: String(transferId || reference),
          message: 'Décaissement en cours de traitement',
        };
      }

      this.logger.error('Flutterwave décaissement réponse:', response);
      return { status: 'failed', message: response?.message || 'Erreur de décaissement' };
    } catch (error: any) {
      this.logger.error('Flutterwave décaissement erreur:', error.message);
      return { status: 'failed', message: error.message || 'Erreur de décaissement Flutterwave' };
    }
  }

  /**
   * Vérifier le statut d'une transaction Flutterwave.
   */
  async checkStatus(providerTransactionId: string): Promise<'completed' | 'pending' | 'failed'> {
    try {
      // Si c'est un tx_ref (commence par xearn_), vérifier via verify-by-reference
      const path = providerTransactionId.startsWith('xearn_')
        ? `/transactions/verify_by_reference?tx_ref=${providerTransactionId}`
        : `/transactions/${providerTransactionId}/verify`;

      const response = await this.apiRequest('GET', path, null);

      if (response?.status === 'success' && response?.data?.status === 'successful') {
        return 'completed';
      } else if (response?.data?.status === 'pending') {
        return 'pending';
      }
      return 'failed';
    } catch {
      return 'failed';
    }
  }

  // ──── Helpers ────

  /**
   * Mapper les méthodes de paiement XEARN vers les codes Flutterwave.
   * Voir: https://developer.flutterwave.com/docs/bank-codes
   */
  private mapMethodToFlutterwave(method: string): string {
    const map: Record<string, string> = {
      'MTN_MOMO': 'FMM',         // Flutterwave Mobile Money
      'FLOOZ': 'FMM',
      'TMONEY': 'FMM',
      'ORANGE_MONEY': 'FMM',
      'MPESA': 'MPS',             // M-Pesa
      'AIRTEL_MONEY': 'FMM',
      'WAVE': 'FMM',
      'MOBILE_MONEY': 'FMM',
      'BANK_TRANSFER': 'NGN',     // Virement bancaire
    };
    return map[method] || 'FMM';
  }

  private async apiRequest(method: string, path: string, body: any): Promise<any> {
    const url = `${this.apiBase}${path}`;
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Flutterwave API ${method} ${path}: ${response.status} — ${errorText}`);
    }

    return response.json();
  }
}
