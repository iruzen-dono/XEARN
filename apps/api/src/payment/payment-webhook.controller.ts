import { Controller, Post, Body, Headers, Logger, HttpCode, RawBodyRequest, Req } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Webhook pour recevoir les confirmations de paiement.
 * Supporte Flutterwave (principal) et FedaPay (legacy).
 *
 * URL à configurer dans le dashboard Flutterwave :
 *   https://votredomaine.com/api/payment/webhook
 */
@Controller('payment')
export class PaymentWebhookController {
  private readonly logger = new Logger('PaymentWebhook');

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /* ───────────────────────────── Flutterwave webhook ───────────────────────────── */

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Body() body: any,
    @Headers('verif-hash') flwVerifHash?: string,
    @Headers('x-fedapay-signature') fedapaySignature?: string,
  ) {
    this.logger.log(`Webhook reçu: ${JSON.stringify(body).substring(0, 300)}`);

    // ─── Détection du provider ───
    if (flwVerifHash || body?.event?.startsWith?.('charge.') || body?.event?.startsWith?.('transfer.')) {
      return this.handleFlutterwaveWebhook(body, flwVerifHash);
    }

    // Legacy FedaPay
    if (fedapaySignature || body?.entity) {
      return this.handleFedapayWebhook(body);
    }

    this.logger.warn('Webhook de provider inconnu — ignoré');
    return { received: true };
  }

  /* ═══════════════════════════ FLUTTERWAVE ═══════════════════════════ */

  private async handleFlutterwaveWebhook(body: any, verifHash?: string) {
    // Vérifier le hash secret — OBLIGATOIRE en production
    const webhookHash = this.configService.get('FLW_WEBHOOK_HASH');
    if (!webhookHash) {
      this.logger.error('FLW_WEBHOOK_HASH non configuré — webhook Flutterwave rejeté par sécurité');
      return { received: false, error: 'Webhook hash not configured' };
    }
    if (verifHash !== webhookHash) {
      this.logger.warn('Flutterwave webhook hash invalide — rejeté');
      return { received: false, error: 'Invalid hash' };
    }

    const event = body?.event;
    const data = body?.data;

    if (!data) {
      this.logger.warn('Flutterwave webhook sans data — ignoré');
      return { received: true };
    }

    try {
      switch (event) {
        case 'charge.completed':
          await this.handleFlwChargeCompleted(data);
          break;
        case 'transfer.completed':
          await this.handleFlwTransferCompleted(data);
          break;
        case 'transfer.failed':
          await this.handleFlwTransferFailed(data);
          break;
        default:
          this.logger.log(`Flutterwave event non géré: ${event}`);
      }
    } catch (error: any) {
      this.logger.error(`Erreur traitement webhook Flutterwave: ${error.message}`, error.stack);
    }

    return { received: true };
  }

  /**
   * Paiement Flutterwave réussi → Activer le compte.
   * data.meta contient userId et type passés lors du collect().
   */
  private async handleFlwChargeCompleted(data: any) {
    if (data.status !== 'successful') {
      this.logger.log(`Charge ${data.id} status=${data.status} — ignoré`);
      return;
    }

    const meta = data.meta || {};
    const userId = meta.userId;
    const type = meta.type;
    const providerTxId = String(data.id);

    if (!userId) {
      this.logger.warn('Charge completed sans userId dans meta');
      return;
    }

    // Idempotence
    const existing = await this.prisma.transaction.findFirst({
      where: { metadata: { path: ['providerTransactionId'], equals: providerTxId } },
    });
    if (existing && existing.status === 'COMPLETED') {
      this.logger.log(`Transaction ${providerTxId} déjà traitée — ignoré`);
      return;
    }

    if (type === 'activation') {
      const amount = data.amount || 4000;

      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: userId },
          data: { status: 'ACTIVATED' },
        }),
        this.prisma.transaction.create({
          data: {
            userId,
            type: 'ACTIVATION',
            status: 'COMPLETED',
            amount,
            description: `Activation du compte (Flutterwave #${providerTxId})`,
            metadata: { providerTransactionId: providerTxId },
          },
        }),
      ]);

      this.logger.log(`Compte ${userId} activé via Flutterwave (TX: ${providerTxId})`);
    }
  }

  /**
   * Transfert Flutterwave réussi → Retrait complété.
   */
  private async handleFlwTransferCompleted(data: any) {
    if (data.status !== 'SUCCESSFUL') {
      this.logger.log(`Transfer ${data.id} status=${data.status} — ignoré`);
      return;
    }

    const meta = data.meta || {};
    const withdrawalId = meta.withdrawalId;
    const userId = meta.userId;

    if (!withdrawalId) {
      this.logger.warn('Transfer completed sans withdrawalId dans meta');
      return;
    }

    const providerTxId = String(data.id);

    await this.prisma.$transaction([
      this.prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'COMPLETED', processedAt: new Date() },
      }),
      this.prisma.transaction.updateMany({
        where: {
          userId,
          type: 'WITHDRAWAL',
          status: 'PENDING',
          metadata: { path: ['withdrawalId'], equals: withdrawalId },
        },
        data: { status: 'COMPLETED' },
      }),
    ]);

    this.logger.log(`Retrait ${withdrawalId} complété via Flutterwave (Transfer: ${providerTxId})`);
  }

  /**
   * Transfert Flutterwave échoué → Rembourser le wallet.
   */
  private async handleFlwTransferFailed(data: any) {
    const meta = data.meta || {};
    const withdrawalId = meta.withdrawalId;
    const userId = meta.userId;

    if (!withdrawalId || !userId) return;

    const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
    if (!withdrawal || withdrawal.status === 'FAILED') return;

    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { userId },
        data: { balance: { increment: withdrawal.amount } },
      }),
      this.prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'FAILED' },
      }),
      this.prisma.transaction.updateMany({
        where: {
          userId,
          type: 'WITHDRAWAL',
          status: 'PENDING',
          metadata: { path: ['withdrawalId'], equals: withdrawalId },
        },
        data: { status: 'FAILED' },
      }),
    ]);

    this.logger.log(`Transfer ${withdrawalId} échoué — wallet de ${userId} remboursé de ${withdrawal.amount} FCFA`);
  }

  /* ═══════════════════════════ FEDAPAY (legacy) ═══════════════════════════ */

  private async handleFedapayWebhook(body: any) {
    const entity = body?.entity;
    const eventType = body?.event;

    if (!entity) {
      this.logger.warn('Webhook FedaPay sans entité — ignoré');
      return { received: true };
    }

    try {
      if (eventType === 'transaction.approved' || eventType === 'transaction.completed') {
        await this.handleTransactionApproved(entity);
      } else if (eventType === 'payout.sent' || eventType === 'payout.completed') {
        await this.handlePayoutCompleted(entity);
      } else if (eventType === 'transaction.declined' || eventType === 'transaction.canceled') {
        await this.handleTransactionFailed(entity);
      } else if (eventType === 'payout.failed') {
        await this.handlePayoutFailed(entity);
      } else {
        this.logger.log(`FedaPay event non géré: ${eventType}`);
      }
    } catch (error: any) {
      this.logger.error(`Erreur traitement webhook FedaPay: ${error.message}`, error.stack);
    }

    return { received: true };
  }

  private async handleTransactionApproved(entity: any) {
    const metadata = entity.metadata || {};
    const userId = metadata.userId;
    const type = metadata.type;

    if (!userId) {
      this.logger.warn('Transaction FedaPay approuvée sans userId dans metadata');
      return;
    }

    const providerTxId = String(entity.id);

    const existing = await this.prisma.transaction.findFirst({
      where: { metadata: { path: ['providerTransactionId'], equals: providerTxId } },
    });
    if (existing && existing.status === 'COMPLETED') {
      this.logger.log(`Transaction ${providerTxId} déjà traitée — ignoré`);
      return;
    }

    if (type === 'activation') {
      const amount = entity.amount || 4000;

      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: userId },
          data: { status: 'ACTIVATED' },
        }),
        this.prisma.transaction.create({
          data: {
            userId,
            type: 'ACTIVATION',
            status: 'COMPLETED',
            amount,
            description: `Activation du compte (FedaPay #${providerTxId})`,
            metadata: { providerTransactionId: providerTxId },
          },
        }),
      ]);

      this.logger.log(`Compte ${userId} activé via FedaPay (TX: ${providerTxId})`);
    }
  }

  private async handlePayoutCompleted(entity: any) {
    const metadata = entity.metadata || {};
    const withdrawalId = metadata.withdrawalId;

    if (!withdrawalId) {
      this.logger.warn('Payout FedaPay complété sans withdrawalId dans metadata');
      return;
    }

    const providerTxId = String(entity.id);

    await this.prisma.$transaction([
      this.prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'COMPLETED', processedAt: new Date() },
      }),
      this.prisma.transaction.updateMany({
        where: {
          userId: metadata.userId,
          type: 'WITHDRAWAL',
          status: 'PENDING',
          metadata: { path: ['withdrawalId'], equals: withdrawalId },
        },
        data: { status: 'COMPLETED' },
      }),
    ]);

    this.logger.log(`Retrait ${withdrawalId} complété via FedaPay (Payout: ${providerTxId})`);
  }

  private async handleTransactionFailed(entity: any) {
    const metadata = entity.metadata || {};
    const userId = metadata.userId;
    const providerTxId = String(entity.id);

    if (userId) {
      await this.prisma.transaction.updateMany({
        where: {
          userId,
          status: 'PENDING',
          metadata: { path: ['providerTransactionId'], equals: providerTxId },
        },
        data: { status: 'FAILED' },
      });
      this.logger.log(`Transaction FedaPay ${providerTxId} échouée pour ${userId}`);
    }
  }

  private async handlePayoutFailed(entity: any) {
    const metadata = entity.metadata || {};
    const withdrawalId = metadata.withdrawalId;
    const userId = metadata.userId;

    if (!withdrawalId || !userId) return;

    const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
    if (!withdrawal || withdrawal.status === 'FAILED') return;

    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { userId },
        data: { balance: { increment: withdrawal.amount } },
      }),
      this.prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'FAILED' },
      }),
      this.prisma.transaction.updateMany({
        where: {
          userId,
          type: 'WITHDRAWAL',
          status: 'PENDING',
          metadata: { path: ['withdrawalId'], equals: withdrawalId },
        },
        data: { status: 'FAILED' },
      }),
    ]);

    this.logger.log(`Payout FedaPay ${withdrawalId} échoué — wallet de ${userId} remboursé de ${withdrawal.amount} FCFA`);
  }
}
