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
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { verifyFedapaySignature } from './fedapay-signature';
import { PaymentService } from './payment.service';
import type { AccountTier } from '@xearn/types';

type FedapayMetadata = {
  userId?: string;
  type?: 'activation' | 'tier_upgrade';
  targetTier?: Exclude<AccountTier, 'NORMAL'>;
  withdrawalId?: string;
  providerTransactionId?: string;
};

interface FedapayEntity {
  id: string | number;
  amount?: number;
  metadata?: FedapayMetadata;
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
@ApiTags('Payments')
export class PaymentWebhookController {
  private readonly logger = new Logger('PaymentWebhook');

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private paymentService: PaymentService,
  ) {}

  // M1 FIX: Rate limit webhooks to prevent HMAC verification DoS
  @Throttle({ default: { ttl: 60000, limit: 100 } }) // 100 webhooks per minute max
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

    // C2 FIX: Anti-replay protection - vérifier si ce webhook a déjà été traité
    const webhookId = `fedapay_${eventType || 'unknown'}_${entity.id}`;
    const existing = await this.prisma.webhookEvent.findUnique({
      where: { webhookId },
    });

    if (existing) {
      this.logger.warn(
        `Webhook ${webhookId} déjà traité le ${existing.processedAt.toISOString()} — ignoré (replay attack?)`,
      );
      return { received: true };
    }

    // Enregistrer le webhook AVANT de le traiter (idempotence)
    await this.prisma.webhookEvent.create({
      data: {
        webhookId,
        eventType: eventType || 'unknown',
        payload: JSON.stringify(body).substring(0, 1000), // Premiers 1000 chars pour debug
      },
    });

    this.logger.log(`FedaPay event: ${eventType || 'unknown'}`);

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
    } catch (error: unknown) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        this.logger.warn(`Webhook business error: ${error.message}`);
        return { received: true };
      }
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Erreur traitement webhook FedaPay: ${err.message}`, err.stack);
      throw error;
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
      const receivedAmount = entity.amount || 0;
      const expectedAmount = this.configService.get<number>('ACTIVATION_PRICE_FCFA') || 4000;

      // CRITIQUE FIX #2: Verify user status BEFORE amount validation
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { status: true, email: true },
      });

      if (!user) {
        this.logger.error(`🚨 FRAUDE: userId ${userId} introuvable (TX: ${providerTxId})`);
        return;
      }

      if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
        this.logger.warn(
          `Activation refusée: utilisateur ${userId} est ${user.status} (TX: ${providerTxId})`,
        );
        return;
      }

      // CRITIQUE: Block if account already activated (protection against sophisticated replay)
      if (user.status === 'ACTIVATED') {
        this.logger.error(
          `🚨 FRAUDE DÉTECTÉE: Tentative d'activation d'un compte déjà activé (userId: ${userId}, TX: ${providerTxId})`,
        );
        await this.prisma.transaction.create({
          data: {
            userId,
            type: 'ACTIVATION',
            status: 'FAILED',
            amount: receivedAmount,
            description: `FRAUDE: Compte déjà activé - tentative de replay`,
            metadata: {
              providerTransactionId: providerTxId,
              fraud: true,
              reason: 'already_activated',
            },
          },
        });
        return;
      }

      // CRITIQUE: Strict equality validation (not just >=)
      if (receivedAmount !== expectedAmount) {
        const discrepancy = receivedAmount < expectedAmount ? 'insuffisant' : 'excessif';
        this.logger.error(
          `🚨 FRAUDE DÉTECTÉE: Montant ${discrepancy} pour activation - reçu: ${receivedAmount} FCFA, attendu: ${expectedAmount} FCFA (TX: ${providerTxId}, user: ${userId}, email: ${user.email})`,
        );
        await this.prisma.transaction.create({
          data: {
            userId,
            type: 'ACTIVATION',
            status: 'FAILED',
            amount: receivedAmount,
            description: `FRAUDE: Montant ${discrepancy} (${receivedAmount} != ${expectedAmount})`,
            metadata: {
              providerTransactionId: providerTxId,
              fraud: true,
              expectedAmount,
              receivedAmount,
              discrepancy,
            },
          },
        });
        return;
      }

      // SECURITY: Double-check with FedaPay API
      const provider = this.paymentService.getProvider();
      if (provider.name === 'fedapay') {
        try {
          const verifiedStatus = await provider.checkStatus(providerTxId);
          if (verifiedStatus !== 'completed') {
            this.logger.error(
              `🚨 FRAUDE: Webhook indique 'approved' mais API FedaPay retourne '${verifiedStatus}' (TX: ${providerTxId})`,
            );
            return;
          }
        } catch (err) {
          this.logger.error(`Erreur lors de la vérification API FedaPay: ${err}`);
          // In case of API error, log but don't block (avoid DoS)
        }
      }

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
              amount: receivedAmount,
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

      const receivedAmount = entity.amount || 0;
      const expectedAmount =
        targetTier === 'PREMIUM'
          ? this.configService.get<number>('PREMIUM_PRICE_FCFA') || 10000
          : this.configService.get<number>('VIP_PRICE_FCFA') || 25000;

      // CRITIQUE FIX #3: Verify user status and current tier BEFORE amount validation
      const upgradeUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { status: true, tier: true, email: true },
      });

      if (!upgradeUser) {
        this.logger.error(`🚨 FRAUDE: userId ${userId} introuvable (TX: ${providerTxId})`);
        return;
      }

      if (upgradeUser.status === 'BANNED' || upgradeUser.status === 'SUSPENDED') {
        this.logger.warn(
          `Upgrade refusé: utilisateur ${userId} est ${upgradeUser.status} (TX: ${providerTxId})`,
        );
        return;
      }

      // CRITIQUE: Block if user already at or above target tier (replay/fraud protection)
      const tierHierarchy = { NORMAL: 0, PREMIUM: 1, VIP: 2 };
      const currentTierLevel = tierHierarchy[upgradeUser.tier] || 0;
      const targetTierLevel = tierHierarchy[targetTier] || 0;

      if (currentTierLevel >= targetTierLevel) {
        this.logger.error(
          `🚨 FRAUDE DÉTECTÉE: Tentative d'upgrade vers ${targetTier} alors que tier actuel est ${upgradeUser.tier} (userId: ${userId}, TX: ${providerTxId})`,
        );
        await this.prisma.transaction.create({
          data: {
            userId,
            type: 'TIER_UPGRADE',
            status: 'FAILED',
            amount: receivedAmount,
            description: `FRAUDE: Tentative d'upgrade vers ${targetTier} avec tier actuel ${upgradeUser.tier}`,
            metadata: {
              providerTransactionId: providerTxId,
              targetTier,
              currentTier: upgradeUser.tier,
              fraud: true,
              reason: 'already_at_or_above_target_tier',
            },
          },
        });
        return;
      }

      // CRITIQUE: Strict equality validation (not just >=)
      if (receivedAmount !== expectedAmount) {
        const discrepancy = receivedAmount < expectedAmount ? 'insuffisant' : 'excessif';
        this.logger.error(
          `🚨 FRAUDE DÉTECTÉE: Montant ${discrepancy} pour upgrade ${targetTier} - reçu: ${receivedAmount} FCFA, attendu: ${expectedAmount} FCFA (TX: ${providerTxId}, user: ${userId}, email: ${upgradeUser.email})`,
        );
        await this.prisma.transaction.create({
          data: {
            userId,
            type: 'TIER_UPGRADE',
            status: 'FAILED',
            amount: receivedAmount,
            description: `FRAUDE: Montant ${discrepancy} pour upgrade ${targetTier} (${receivedAmount} != ${expectedAmount})`,
            metadata: {
              providerTransactionId: providerTxId,
              targetTier,
              expectedAmount,
              receivedAmount,
              discrepancy,
              fraud: true,
            },
          },
        });
        return;
      }

      // SECURITY: Double-check with FedaPay API
      const provider = this.paymentService.getProvider();
      if (provider.name === 'fedapay') {
        try {
          const verifiedStatus = await provider.checkStatus(providerTxId);
          if (verifiedStatus !== 'completed') {
            this.logger.error(
              `🚨 FRAUDE: Webhook indique 'approved' mais API FedaPay retourne '${verifiedStatus}' (TX: ${providerTxId})`,
            );
            return;
          }
        } catch (err) {
          this.logger.error(`Erreur lors de la vérification API FedaPay: ${err}`);
          // In case of API error, log but don't block (avoid DoS)
        }
      }

      if (existing) {
        await this.prisma.$transaction([
          this.prisma.user.update({
            where: { id: userId },
            data: { tier: targetTier },
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
            data: { tier: targetTier },
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

    // C4 fix: Idempotency check — skip if withdrawal already completed
    const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
    if (!withdrawal || withdrawal.status === 'COMPLETED') {
      this.logger.log(`Retrait ${withdrawalId} déjà complété ou introuvable — ignoré`);
      return;
    }

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
    if (!withdrawal || withdrawal.status === 'FAILED' || withdrawal.status === 'COMPLETED') return;

    // withdrawal.amount stores NET; find GROSS from the transaction record
    const originalTx = await this.prisma.transaction.findFirst({
      where: { type: 'WITHDRAWAL', metadata: { path: ['withdrawalId'], equals: withdrawalId } },
    });
    const grossAmount = originalTx ? originalTx.amount : withdrawal.amount;

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$queryRaw`
        SELECT 1 FROM "wallets" WHERE "userId" = ${userId} FOR UPDATE
      `;
      await tx.wallet.update({
        where: { userId },
        data: { balance: { increment: grossAmount } },
      });
      await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'FAILED' },
      });
      await tx.transaction.updateMany({
        where: {
          userId,
          type: 'WITHDRAWAL',
          status: 'PENDING',
          metadata: { path: ['withdrawalId'], equals: withdrawalId },
        },
        data: { status: 'FAILED' },
      });
    });

    this.logger.log(
      `Payout FedaPay ${withdrawalId} échoué — wallet de ${userId} remboursé de ${grossAmount} FCFA`,
    );
  }
}
