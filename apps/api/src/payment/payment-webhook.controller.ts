import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  HttpCode,
  RawBodyRequest,
  Req,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { verifyFedapaySignature } from './fedapay-signature';

interface FedapayEntity {
  id: string | number;
  amount?: number;
  metadata?: Record<string, string>;
  [key: string]: unknown;
}

interface FedapayWebhookBody {
  entity?: FedapayEntity;
  event?: string;
}

/**
 * Webhook pour recevoir les confirmations de paiement.
 * Supporte FedaPay.
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
    @Body() body: FedapayWebhookBody,
    @Headers('x-fedapay-signature') fedapaySignature?: string,
    @Req() req?: RawBodyRequest<Request>,
  ) {
    this.logger.log(`Webhook reçu: ${JSON.stringify(body).substring(0, 300)}`);

    if (fedapaySignature || body?.entity) {
      const secret =
        this.configService.get('FEDAPAY_WEBHOOK_SECRET') ||
        this.configService.get('FEDAPAY_SECRET_KEY');
      if (!secret) {
        this.logger.error('FEDAPAY_WEBHOOK_SECRET non configuré — webhook rejeté par sécurité');
        throw new BadRequestException('Webhook secret not configured');
      }

      const isValid = verifyFedapaySignature(req?.rawBody, fedapaySignature, secret);
      if (!isValid) {
        this.logger.warn('Signature FedaPay invalide — webhook rejeté');
        throw new ForbiddenException('Invalid signature');
      }
      return this.handleFedapayWebhook(body);
    }

    this.logger.warn('Webhook FedaPay invalide — ignoré');
    throw new BadRequestException('Unrecognized webhook format');
  }

  /* ═══════════════════════════ FEDAPAY ═══════════════════════════ */

  private async handleFedapayWebhook(body: FedapayWebhookBody) {
    const entity = body?.entity;
    const eventType = body?.event;

    if (!entity) {
      this.logger.warn('Webhook FedaPay sans entité — ignoré');
      return { received: true };
    }

    try {
      this.logger.log(`FedaPay event: ${eventType || 'unknown'}`);

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
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Erreur traitement webhook FedaPay: ${err.message}`, err.stack);
    }

    return { received: true };
  }

  private async handleTransactionApproved(entity: FedapayEntity) {
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

      // Update existing PENDING transaction or create new one (idempotent)
      if (existing) {
        await this.prisma.$transaction([
          this.prisma.user.update({
            where: { id: userId },
            data: { status: 'ACTIVATED' },
          }),
          this.prisma.transaction.update({
            where: { id: existing.id },
            data: {
              status: 'COMPLETED',
              description: `Activation du compte (FedaPay #${providerTxId})`,
            },
          }),
        ]);
      } else {
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
      }

      this.logger.log(`Compte ${userId} activé via FedaPay (TX: ${providerTxId})`);
    } else if (type === 'tier_upgrade') {
      const targetTier = metadata.targetTier;
      if (!targetTier) {
        this.logger.warn(`tier_upgrade sans targetTier dans metadata (TX: ${providerTxId})`);
        return;
      }

      if (existing) {
        await this.prisma.$transaction([
          this.prisma.user.update({
            where: { id: userId },
            data: { tier: targetTier as any },
          }),
          this.prisma.transaction.update({
            where: { id: existing.id },
            data: {
              status: 'COMPLETED',
              description: `Upgrade vers ${targetTier} (FedaPay #${providerTxId})`,
            },
          }),
        ]);
      } else {
        await this.prisma.$transaction([
          this.prisma.user.update({
            where: { id: userId },
            data: { tier: targetTier as any },
          }),
          this.prisma.transaction.create({
            data: {
              userId,
              type: 'TIER_UPGRADE',
              status: 'COMPLETED',
              amount: entity.amount || 0,
              description: `Upgrade vers ${targetTier} (FedaPay #${providerTxId})`,
              metadata: { providerTransactionId: providerTxId, targetTier },
            },
          }),
        ]);
      }

      this.logger.log(
        `Utilisateur ${userId} upgradé vers ${targetTier} via FedaPay (TX: ${providerTxId})`,
      );
    }
  }

  private async handlePayoutCompleted(entity: FedapayEntity) {
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

  private async handleTransactionFailed(entity: FedapayEntity) {
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

  private async handlePayoutFailed(entity: FedapayEntity) {
    const metadata = entity.metadata || {};
    const withdrawalId = metadata.withdrawalId;
    const userId = metadata.userId;

    if (!withdrawalId || !userId) return;

    const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
    if (!withdrawal || withdrawal.status === 'FAILED') return;

    // withdrawal.amount stores NET; find GROSS from the transaction record
    const originalTx = await this.prisma.transaction.findFirst({
      where: { type: 'WITHDRAWAL', metadata: { path: ['withdrawalId'], equals: withdrawalId } },
    });
    const grossAmount = originalTx ? originalTx.amount : withdrawal.amount;

    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { userId },
        data: { balance: { increment: grossAmount } },
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

    this.logger.log(
      `Payout FedaPay ${withdrawalId} échoué — wallet de ${userId} remboursé de ${grossAmount} FCFA`,
    );
  }
}
