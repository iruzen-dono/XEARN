import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from './payment.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PaymentReconciliationService {
  private readonly logger = new Logger(PaymentReconciliationService.name);

  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService,
    private notificationsService: NotificationsService,
  ) {}

  // Every 5 minutes
  @Cron('*/5 * * * *')
  async reconcile() {
    await Promise.all([
      this.reconcileActivations(),
      this.reconcileTierUpgrades(),
      this.reconcileWithdrawals(),
    ]);
  }

  private async reconcileActivations() {
    const pending = await this.prisma.transaction.findMany({
      where: { type: 'ACTIVATION', status: 'PENDING' },
    });

    if (!pending.length) return;

    const provider = this.paymentService.getProvider();

    for (const tx of pending) {
      const providerTransactionId = (tx.metadata as any)?.providerTransactionId as
        | string
        | undefined;
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
      const providerTransactionId = (tx.metadata as any)?.providerTransactionId as
        | string
        | undefined;
      const targetTier = (tx.metadata as any)?.targetTier as string | undefined;
      if (!providerTransactionId || !targetTier) continue;

      const status = await provider.checkStatus(providerTransactionId);
      if (status === 'completed') {
        await this.prisma.$transaction([
          this.prisma.user.update({
            where: { id: tx.userId },
            data: { tier: targetTier as any },
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

      const providerTransactionId = (tx?.metadata as any)?.providerTransactionId as
        | string
        | undefined;
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
        await this.prisma.$transaction([
          this.prisma.withdrawal.update({
            where: { id: withdrawal.id },
            data: { status: 'FAILED' },
          }),
          this.prisma.wallet.update({
            where: { userId: withdrawal.userId },
            data: { balance: { increment: grossAmount } },
          }),
          this.prisma.transaction.updateMany({
            where: {
              metadata: { path: ['withdrawalId'], equals: withdrawal.id },
              type: 'WITHDRAWAL',
            },
            data: { status: 'FAILED' },
          }),
        ]);

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
