import { Controller, Post, Body, Headers, Logger, HttpCode } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

/**
 * Webhook pour recevoir les confirmations de paiement FedaPay.
 * 
 * FedaPay envoie un POST à cette URL quand un paiement change de statut.
 * URL à configurer dans le dashboard FedaPay : https://votredomaine.com/api/payment/webhook
 */
@Controller('payment')
export class PaymentWebhookController {
  private readonly logger = new Logger('PaymentWebhook');

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Body() body: any,
    @Headers('x-fedapay-signature') signature?: string,
  ) {
    this.logger.log(`Webhook reçu: ${JSON.stringify(body).substring(0, 300)}`);

    // TODO: Vérifier la signature FedaPay en production
    // const webhookSecret = this.configService.get('FEDAPAY_WEBHOOK_SECRET');

    const entity = body?.entity;
    const eventType = body?.event;

    if (!entity) {
      this.logger.warn('Webhook sans entité — ignoré');
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
        this.logger.log(`Webhook event non géré: ${eventType}`);
      }
    } catch (error: any) {
      this.logger.error(`Erreur traitement webhook: ${error.message}`, error.stack);
    }

    return { received: true };
  }

  /**
   * Transaction de collecte approuvée → Activer le compte de l'utilisateur.
   */
  private async handleTransactionApproved(entity: any) {
    const metadata = entity.metadata || {};
    const userId = metadata.userId;
    const type = metadata.type; // 'activation'

    if (!userId) {
      this.logger.warn('Transaction approuvée sans userId dans metadata');
      return;
    }

    const providerTxId = String(entity.id);

    // Vérifier qu'on n'a pas déjà traité cette transaction
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

  /**
   * Décaissement envoyé → Marquer le retrait comme complété.
   */
  private async handlePayoutCompleted(entity: any) {
    const metadata = entity.metadata || {};
    const withdrawalId = metadata.withdrawalId;

    if (!withdrawalId) {
      this.logger.warn('Payout complété sans withdrawalId dans metadata');
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

  /**
   * Transaction de collecte échouée → Annuler la transaction pending.
   */
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
      this.logger.log(`Transaction ${providerTxId} échouée pour ${userId}`);
    }
  }

  /**
   * Décaissement échoué → Rembourser le wallet et marquer comme échoué.
   */
  private async handlePayoutFailed(entity: any) {
    const metadata = entity.metadata || {};
    const withdrawalId = metadata.withdrawalId;
    const userId = metadata.userId;

    if (!withdrawalId || !userId) return;

    const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
    if (!withdrawal || withdrawal.status === 'FAILED') return;

    // Rembourser le wallet
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

    this.logger.log(`Payout ${withdrawalId} échoué — wallet de ${userId} remboursé de ${withdrawal.amount} FCFA`);
  }
}
