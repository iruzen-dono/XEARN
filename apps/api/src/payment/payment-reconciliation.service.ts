import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from './payment.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { AccountTier } from '@xearn/types';

type ReconciliationMetadata = {
  providerTransactionId?: string;
  targetTier?: Exclude<AccountTier, 'NORMAL'>;
  withdrawalId?: string;
  userId?: string;
};

@Injectable()
export class PaymentReconciliationService {
  private readonly logger = new Logger(PaymentReconciliationService.name);
  private running = false;
  private runningStartedAt: number | null = null;
  private readonly RECONCILIATION_TIMEOUT_MS = 4 * 60 * 1000; // 4 minutes (cron runs every 5 min)

  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * MAJEUR FIX #4: Retry exponentiel pour opérations de réconciliation
   */
  private async reconcileWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries = 3,
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) {
          this.logger.error(`${operationName} failed after ${maxRetries} attempts: ${error}`);
          throw error;
        }
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10s
        this.logger.warn(
          `${operationName} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error(`${operationName} failed after max retries`);
  }

  @Cron('*/5 * * * *')
  async reconcile() {
    // R1 fix: Reset the running flag if it's been stuck for too long
    if (this.running && this.runningStartedAt) {
      const elapsed = Date.now() - this.runningStartedAt;
      if (elapsed > this.RECONCILIATION_TIMEOUT_MS) {
        this.logger.error(
          `Reconciliation has been running for ${elapsed}ms, forcing reset. Previous run may have crashed.`,
        );
        this.running = false;
        this.runningStartedAt = null;
      }
    }

    if (this.running) {
      this.logger.warn('Reconciliation already running, skipping');
      return;
    }

    this.running = true;
    this.runningStartedAt = Date.now();

    try {
      // MAJEUR FIX #4: Wrap each reconciliation with retry logic
      await Promise.all([
        this.reconcileWithRetry(() => this.reconcileActivations(), 'reconcileActivations'),
        this.reconcileWithRetry(() => this.reconcileTierUpgrades(), 'reconcileTierUpgrades'),
        this.reconcileWithRetry(() => this.reconcileWithdrawals(), 'reconcileWithdrawals'),
      ]);
    } finally {
      this.running = false;
      this.runningStartedAt = null;
    }
  }

  private async reconcileActivations() {
    const pending = await this.prisma.transaction.findMany({
      where: { type: 'ACTIVATION', status: 'PENDING' },
    });

    if (!pending.length) return;

    const provider = this.paymentService.getProvider();

    for (const tx of pending) {
      const metadata = tx.metadata as ReconciliationMetadata | null;
      const providerTransactionId = metadata?.providerTransactionId;
      if (!providerTransactionId) continue;

      const status = await provider.checkStatus(providerTransactionId);
      if (status === 'completed') {
        await this.prisma.$transaction([
          this.prisma.user.update({
            where: { id: tx.userId },
            data: { status: 'ACTIVATED' },
          }),
          this.prisma.transaction.update({
            where: { id: tx.id },
            data: { status: 'COMPLETED' },
          }),
        ]);

        try {
          await this.notificationsService.notifyAccountActivated(tx.userId);
        } catch {
          /* ignore */
        }

        this.logger.log(`Activation reconcilee: ${tx.id} (${providerTransactionId})`);
      } else if (status === 'failed') {
        await this.prisma.transaction.update({
          where: { id: tx.id },
          data: { status: 'FAILED' },
        });
        this.logger.warn(`Activation echouee: ${tx.id} (${providerTransactionId})`);
      }
    }
  }

  private async reconcileTierUpgrades() {
    const pending = await this.prisma.transaction.findMany({
      where: { type: 'TIER_UPGRADE', status: 'PENDING' },
    });

    if (!pending.length) return;

    const provider = this.paymentService.getProvider();

    for (const tx of pending) {
      const metadata = tx.metadata as ReconciliationMetadata | null;
      const providerTransactionId = metadata?.providerTransactionId;
      const targetTier = metadata?.targetTier;
      if (!providerTransactionId || !targetTier) continue;

      const status = await provider.checkStatus(providerTransactionId);
      if (status === 'completed') {
        await this.prisma.$transaction([
          this.prisma.user.update({
            where: { id: tx.userId },
            data: { tier: targetTier },
          }),
          this.prisma.transaction.update({
            where: { id: tx.id },
            data: { status: 'COMPLETED' },
          }),
        ]);
        this.logger.log(
          `Tier upgrade reconcilié: ${tx.id} (${providerTransactionId}) -> ${targetTier}`,
        );
      } else if (status === 'failed') {
        await this.prisma.transaction.update({
          where: { id: tx.id },
          data: { status: 'FAILED' },
        });
        this.logger.warn(`Tier upgrade echoué: ${tx.id} (${providerTransactionId})`);
      }
    }
  }

  private async reconcileWithdrawals() {
    const pendingWithdrawals = await this.prisma.withdrawal.findMany({
      where: { status: { in: ['PENDING', 'PROCESSING'] } },
    });

    if (!pendingWithdrawals.length) return;

    const provider = this.paymentService.getProvider();

    for (const withdrawal of pendingWithdrawals) {
      const tx = await this.prisma.transaction.findFirst({
        where: {
          userId: withdrawal.userId,
          type: 'WITHDRAWAL',
          metadata: { path: ['withdrawalId'], equals: withdrawal.id },
        },
      });

      const metadata = tx?.metadata as ReconciliationMetadata | null;
      const providerTransactionId = metadata?.providerTransactionId;
      if (!providerTransactionId) continue;

      const status = await provider.checkStatus(providerTransactionId);
      if (status === 'completed') {
        await this.prisma.$transaction([
          this.prisma.withdrawal.update({
            where: { id: withdrawal.id },
            data: { status: 'COMPLETED', processedAt: new Date() },
          }),
          this.prisma.transaction.updateMany({
            where: {
              metadata: { path: ['withdrawalId'], equals: withdrawal.id },
              type: 'WITHDRAWAL',
            },
            data: { status: 'COMPLETED' },
          }),
        ]);

        try {
          await this.notificationsService.notifyWithdrawalApproved(
            withdrawal.userId,
            Number(withdrawal.amount),
          );
        } catch {
          /* ignore */
        }

        this.logger.log(`Retrait reconcilié: ${withdrawal.id} (${providerTransactionId})`);
      } else if (status === 'failed') {
        // withdrawal.amount stores NET; tx.amount stores GROSS — refund GROSS
        const grossAmount = tx ? tx.amount : withdrawal.amount;
        await this.prisma.$transaction(async (ptx: Prisma.TransactionClient) => {
          await ptx.$queryRaw`
            SELECT 1 FROM "wallets" WHERE "userId" = ${withdrawal.userId} FOR UPDATE
          `;
          await ptx.withdrawal.update({
            where: { id: withdrawal.id },
            data: { status: 'FAILED' },
          });
          await ptx.wallet.update({
            where: { userId: withdrawal.userId },
            data: { balance: { increment: grossAmount } },
          });
          await ptx.transaction.updateMany({
            where: {
              metadata: { path: ['withdrawalId'], equals: withdrawal.id },
              type: 'WITHDRAWAL',
            },
            data: { status: 'FAILED' },
          });
        });

        try {
          await this.notificationsService.notifyWithdrawalRejected(
            withdrawal.userId,
            Number(withdrawal.amount),
          );
        } catch {
          /* ignore */
        }

        this.logger.warn(`Retrait echoue: ${withdrawal.id} (${providerTransactionId})`);
      }
    }
  }
}
