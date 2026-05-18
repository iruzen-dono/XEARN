import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
import { PaymentService } from '../payment/payment.service';
import { PlatformBalanceService } from './platform-balance.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { AccountTier, PaymentMethod } from '@xearn/types';
import {
  InsufficientBalanceException,
  AccountNotActivatedException,
  WithdrawalMinimumException,
  DuplicateOperationException,
} from '../common/exceptions';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private paymentService: PaymentService,
    private platformBalanceService: PlatformBalanceService,
    private notificationsService: NotificationsService,
  ) {}

  // H3 FIX: Sanitize user names before sending to external APIs to prevent XSS
  private sanitizeName(name: string): string {
    return name.replace(/[<>'"]/g, '');
  }

  // ── Fee rates by tier (percentage of withdrawal amount) ──
  private getWithdrawalFeePercent(tier: AccountTier): number {
    switch (tier) {
      case 'VIP':
        return 2;
      case 'PREMIUM':
        return 5;
      default:
        return 10; // NORMAL
    }
  }

  // ── Tier upgrade prices ──
  private getTierUpgradePrice(targetTier: Exclude<AccountTier, 'NORMAL'>): number {
    switch (targetTier) {
      case 'PREMIUM':
        return this.configService.get<number>('PREMIUM_PRICE_FCFA') || 10000;
      case 'VIP':
        return this.configService.get<number>('VIP_PRICE_FCFA') || 25000;
      default:
        return 0;
    }
  }

  private readonly TIER_ORDER: readonly AccountTier[] = ['NORMAL', 'PREMIUM', 'VIP'];

  async getWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) return null;

    // Compute withdrawal stats for the frontend
    const [completedWithdrawals, pendingWithdrawals] = await Promise.all([
      this.prisma.withdrawal.aggregate({
        where: { userId, status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      this.prisma.withdrawal.aggregate({
        where: { userId, status: 'PENDING' },
        _sum: { amount: true },
      }),
    ]);

    return {
      ...wallet,
      balance: Number(wallet.balance),
      totalEarned: Number(wallet.totalEarned),
      totalWithdrawn: Number(completedWithdrawals._sum?.amount || 0),
      pendingWithdrawal: Number(pendingWithdrawals._sum?.amount || 0),
    };
  }

  async getTransactions(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.transaction.count({ where: { userId } }),
    ]);
    return { transactions, total, page, limit };
  }

  async activateAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (user.status === 'ACTIVATED') throw new DuplicateOperationException('activation de compte');
    if (user.status === 'SUSPENDED' || user.status === 'BANNED') {
      throw new BadRequestException('Compte suspendu ou banni — contactez le support');
    }

    const price = this.configService.get<number>('ACTIVATION_PRICE_FCFA') || 4000;
    const provider = this.paymentService.getProvider();

    const result = await provider.collect({
      amount: price,
      description: `Activation du compte XEARN — ${user.firstName} ${user.lastName}`,
      customerEmail: user.email || undefined,
      customerName: this.sanitizeName(`${user.firstName} ${user.lastName}`),
      customerPhone: user.phone || undefined,
      callbackMeta: { userId, type: 'activation' },
    });

    if (result.status === 'completed') {
      // Paiement mock — activation immédiate
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
            amount: price,
            description: `Activation du compte (${provider.name})`,
            metadata: { providerTransactionId: result.providerTransactionId },
          },
        }),
      ]);
      // Notification d'activation
      try {
        await this.notificationsService.notifyAccountActivated(userId);
      } catch (err) {
        /* ignore */
      }
      return { success: true, message: 'Compte activé avec succès', status: 'completed' };
    }

    if (result.status === 'pending' && result.paymentUrl) {
      // Paiement réel — créer transaction pending et retourner l'URL
      await this.prisma.transaction.create({
        data: {
          userId,
          type: 'ACTIVATION',
          status: 'PENDING',
          amount: price,
          description: `Activation en attente de paiement (${provider.name})`,
          metadata: { providerTransactionId: result.providerTransactionId },
        },
      });
      return {
        success: true,
        message: result.message,
        status: 'pending',
        paymentUrl: result.paymentUrl,
        providerTransactionId: result.providerTransactionId,
      };
    }

    throw new BadRequestException(result.message || 'Erreur lors du paiement');
  }

  async requestWithdrawal(
    userId: string,
    amount: number,
    method: PaymentMethod,
    accountInfo: string,
  ) {
    const minWithdrawal = this.configService.get<number>('WITHDRAWAL_MIN_FCFA') || 2000;
    const maxWithdrawal = 5000000; // 5 millions FCFA - limite sécurité

    // CRITIQUE 1 FIX: Validation stricte des montants
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Montant invalide');
    }

    if (amount < minWithdrawal) {
      throw new WithdrawalMinimumException(minWithdrawal);
    }

    if (amount > maxWithdrawal) {
      throw new BadRequestException(
        `Montant maximum de retrait: ${maxWithdrawal.toLocaleString()} FCFA`,
      );
    }

    // Vérifier que c'est un entier (FCFA n'a pas de centimes)
    if (!Number.isInteger(amount)) {
      throw new BadRequestException('Le montant doit être un nombre entier (FCFA)');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status !== 'ACTIVATED') {
      throw new AccountNotActivatedException();
    }
    // Calculate withdrawal fee based on tier
    const feePercent = this.getWithdrawalFeePercent(user.tier);
    const feeAmount = Math.round((amount * feePercent) / 100);
    const netAmount = amount - feeAmount;
    const provider = this.paymentService.getProvider();

    // C1 FIX: Vérifier qu'aucun retrait n'est déjà en cours pour cet utilisateur
    const pendingWithdrawal = await this.prisma.withdrawal.findFirst({
      where: {
        userId,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    });

    if (pendingWithdrawal) {
      throw new DuplicateOperationException('retrait en cours');
    }

    // MAJEUR FIX #3: Vérifier la solvabilité de la plateforme avant traitement
    const canProcess = await this.platformBalanceService.canProcessWithdrawal(new Decimal(amount));
    if (!canProcess) {
      this.logger.error(
        `🚨 Retrait refusé pour ${userId} (${amount} FCFA) - plateforme insolvable`,
      );
      throw new BadRequestException(
        'Service temporairement indisponible. Veuillez réessayer plus tard.',
      );
    }

    // MODÉRÉ 2 FIX: Limites quotidiennes de retrait (anti-drainage)
    const last24h = await this.prisma.withdrawal.findMany({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        status: { in: ['PENDING', 'PROCESSING', 'COMPLETED'] },
      },
    });

    // Limite: retraits par 24h (configurable via env)
    const dailyCountLimit = this.configService.get<number>('WITHDRAWAL_DAILY_COUNT_LIMIT') || 3;
    if (last24h.length >= dailyCountLimit) {
      throw new BadRequestException(
        `Limite de ${dailyCountLimit} retraits par 24h atteinte. Réessayez demain.`,
      );
    }

    // Limite: FCFA total par 24h (configurable via env)
    const dailyAmountLimit = this.configService.get<number>('WITHDRAWAL_DAILY_LIMIT_FCFA') || 50000;
    const totalLast24h = last24h.reduce((sum, w) => sum + Number(w.amount), 0);
    if (totalLast24h + amount > dailyAmountLimit) {
      throw new BadRequestException(
        `Limite de ${dailyAmountLimit.toLocaleString()} FCFA par 24h atteinte. Vous avez déjà retiré ${totalLast24h.toLocaleString()} FCFA aujourd'hui.`,
      );
    }

    // Transaction atomique : vérifier le solde + débiter le wallet + créer le retrait
    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // C3 fix: Use SELECT FOR UPDATE to prevent concurrent withdrawal race conditions
      const [lockedWallet] = await tx.$queryRaw<{ balance: Decimal | number | string }[]>`
        SELECT balance FROM "wallets" WHERE "userId" = ${userId} FOR UPDATE
      `;
      if (
        !lockedWallet ||
        new Decimal(String(lockedWallet.balance)).lessThan(new Decimal(amount))
      ) {
        const available = lockedWallet ? Number(lockedWallet.balance) : 0;
        throw new InsufficientBalanceException(available, amount);
      }

      // Débiter le wallet
      await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: amount } },
      });

      // Créer le retrait (montant net après frais)
      const withdrawal = await tx.withdrawal.create({
        data: {
          userId,
          amount: netAmount,
          method,
          accountInfo,
        },
      });

      // Créer la transaction
      await tx.transaction.create({
        data: {
          userId,
          type: 'WITHDRAWAL',
          status: 'PENDING',
          amount,
          description: `Retrait via ${method} (frais ${feePercent}% = ${feeAmount} FCFA, net = ${netAmount} FCFA)`,
          metadata: { withdrawalId: withdrawal.id, feePercent, feeAmount, netAmount },
        },
      });

      return withdrawal;
    });

    // Lancer le décaissement réel (hors transaction DB)
    try {
      const disbursement = await provider.disburse({
        amount: netAmount,
        method,
        accountInfo,
        recipientName: this.sanitizeName(`${user.firstName} ${user.lastName}`),
        callbackMeta: { withdrawalId: result.id, userId },
      });

      if (disbursement.providerTransactionId) {
        await this.prisma.transaction.updateMany({
          where: {
            userId,
            type: 'WITHDRAWAL',
            status: 'PENDING',
            metadata: { path: ['withdrawalId'], equals: result.id },
          },
          data: {
            metadata: {
              withdrawalId: result.id,
              providerTransactionId: disbursement.providerTransactionId,
            },
          },
        });
      }

      if (disbursement.status === 'completed') {
        // Mock — marquer comme complété immédiatement
        await this.prisma.$transaction([
          this.prisma.withdrawal.update({
            where: { id: result.id },
            data: { status: 'COMPLETED', processedAt: new Date() },
          }),
          this.prisma.transaction.updateMany({
            where: {
              userId,
              type: 'WITHDRAWAL',
              status: 'PENDING',
              metadata: { path: ['withdrawalId'], equals: result.id },
            },
            data: { status: 'COMPLETED' },
          }),
        ]);
      } else if (disbursement.status === 'pending') {
        await this.prisma.withdrawal.update({
          where: { id: result.id },
          data: { status: 'PROCESSING' },
        });
      }

      return {
        withdrawal: result,
        paymentStatus: disbursement.status,
        message: disbursement.message,
      };
    } catch {
      // En cas d'erreur du provider, le retrait reste PENDING
      return {
        withdrawal: result,
        paymentStatus: 'pending',
        message: 'Retrait créé — en attente de traitement',
      };
    }
  }

  // M4 fix: Paginate withdrawals
  async getWithdrawals(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [withdrawals, total] = await Promise.all([
      this.prisma.withdrawal.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.withdrawal.count({ where: { userId } }),
    ]);
    return { withdrawals, total, page, limit };
  }

  // Admin: stats globales
  async getGlobalStats() {
    const [
      totalBalance,
      totalWithdrawals,
      pendingWithdrawals,
      completedWithdrawals,
      totalRevenue,
      totalTransactions,
    ] = await Promise.all([
      this.prisma.wallet.aggregate({ _sum: { balance: true } }),
      this.prisma.withdrawal.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      this.prisma.withdrawal.count({ where: { status: 'PENDING' } }),
      this.prisma.withdrawal.count({ where: { status: 'COMPLETED' } }),
      this.prisma.transaction.aggregate({
        where: { type: 'ACTIVATION', status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      this.prisma.transaction.count(),
    ]);

    return {
      totalBalance: totalBalance._sum.balance || 0,
      totalWithdrawals: totalWithdrawals._sum.amount || 0,
      pendingWithdrawals,
      completedWithdrawals,
      totalRevenue: totalRevenue._sum.amount || 0,
      totalTransactions,
    };
  }

  // Admin: liste retraits en attente
  async getPendingWithdrawals(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [withdrawals, total] = await Promise.all([
      this.prisma.withdrawal.findMany({
        where: { status: 'PENDING' },
        include: {
          user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.withdrawal.count({ where: { status: 'PENDING' } }),
    ]);
    return { withdrawals, total, page, limit };
  }

  // Admin: approuver un retrait
  async approveWithdrawal(withdrawalId: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: { user: true },
    });
    if (!withdrawal) throw new BadRequestException('Retrait introuvable');
    if (withdrawal.status !== 'PENDING') {
      throw new BadRequestException('Retrait déjà traité');
    }

    // CRITIQUE 2 FIX: Vérifier qu'une transaction PENDING existe (montant débité)
    const pendingTx = await this.prisma.transaction.findFirst({
      where: {
        metadata: { path: ['withdrawalId'], equals: withdrawalId },
        type: 'WITHDRAWAL',
        status: 'PENDING',
      },
    });

    if (!pendingTx) {
      this.logger.error(
        `ALERTE: Tentative d'approbation du retrait ${withdrawalId} sans transaction PENDING. Possible fraude ou erreur.`,
      );
      throw new BadRequestException(
        "Transaction de retrait introuvable. Le montant n'a peut-être pas été débité. Vérifiez le wallet avant d'approuver.",
      );
    }

    // Vérifier que le montant net correspond (pendingTx.amount = brut, withdrawal.amount = net)
    const txMetadata = pendingTx.metadata as Record<string, unknown> | null;
    const expectedNet = txMetadata?.netAmount != null ? Number(txMetadata.netAmount) : null;
    if (expectedNet !== null && expectedNet !== Number(withdrawal.amount)) {
      this.logger.error(
        `ALERTE: Montant incohérent pour retrait ${withdrawalId}. Net attendu: ${expectedNet}, Retrait: ${withdrawal.amount}`,
      );
      throw new BadRequestException('Montant incohérent entre transaction et retrait');
    }

    const result = await this.prisma.$transaction([
      this.prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'COMPLETED', processedAt: new Date() },
      }),
      this.prisma.transaction.updateMany({
        where: {
          metadata: { path: ['withdrawalId'], equals: withdrawalId },
          type: 'WITHDRAWAL',
          status: 'PENDING',
        },
        data: { status: 'COMPLETED' },
      }),
    ]);

    // Notification
    try {
      await this.notificationsService.notifyWithdrawalApproved(
        withdrawal.userId,
        Number(withdrawal.amount),
      );
    } catch (err) {
      /* ignore */
    }

    return result;
  }

  async rejectWithdrawal(withdrawalId: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
    if (!withdrawal) throw new BadRequestException('Retrait introuvable');
    if (withdrawal.status !== 'PENDING') throw new BadRequestException('Retrait déjà traité');

    const originalTx = await this.prisma.transaction.findFirst({
      where: { type: 'WITHDRAWAL', metadata: { path: ['withdrawalId'], equals: withdrawalId } },
    });
    const grossAmount = originalTx ? originalTx.amount : withdrawal.amount;

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$queryRaw`
        SELECT 1 FROM "wallets" WHERE "userId" = ${withdrawal.userId} FOR UPDATE
      `;

      await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'FAILED' },
      });

      await tx.wallet.update({
        where: { userId: withdrawal.userId },
        data: { balance: { increment: grossAmount } },
      });

      await tx.transaction.updateMany({
        where: {
          metadata: { path: ['withdrawalId'], equals: withdrawalId },
          type: 'WITHDRAWAL',
          status: 'PENDING',
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
      /* notification failure is non-critical */
    }
  }

  // ═══════════════════════════════════════════════════
  // TIER UPGRADE (Premium / VIP)
  // ═══════════════════════════════════════════════════
  async upgradeTier(userId: string, targetTier: Exclude<AccountTier, 'NORMAL'>) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });
    if (!user) throw new BadRequestException('Utilisateur introuvable');
    if (user.status !== 'ACTIVATED')
      throw new BadRequestException("Compte non activé — activez d'abord votre compte");

    const currentIdx = this.TIER_ORDER.indexOf(user.tier);
    const targetIdx = this.TIER_ORDER.indexOf(targetTier);
    if (targetIdx <= currentIdx) {
      throw new BadRequestException(
        `Vous êtes déjà ${user.tier} — impossible de passer à ${targetTier}`,
      );
    }

    const price = this.getTierUpgradePrice(targetTier);
    const provider = this.paymentService.getProvider();

    const result = await provider.collect({
      amount: price,
      description: `Upgrade vers ${targetTier} XEARN — ${user.firstName} ${user.lastName}`,
      customerEmail: user.email || undefined,
      customerName: `${user.firstName} ${user.lastName}`,
      customerPhone: user.phone || undefined,
      callbackMeta: { userId, type: 'tier_upgrade', targetTier },
    });

    if (result.status === 'completed') {
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
            amount: price,
            description: `Upgrade vers ${targetTier}`,
            metadata: { providerTransactionId: result.providerTransactionId, targetTier },
          },
        }),
      ]);
      return {
        success: true,
        message: `Félicitations ! Vous êtes maintenant ${targetTier}`,
        status: 'completed',
        tier: targetTier,
      };
    }

    if (result.status === 'pending' && result.paymentUrl) {
      await this.prisma.transaction.create({
        data: {
          userId,
          type: 'TIER_UPGRADE',
          status: 'PENDING',
          amount: price,
          description: `Upgrade ${targetTier} en attente de paiement`,
          metadata: { providerTransactionId: result.providerTransactionId, targetTier },
        },
      });
      return {
        success: true,
        message: result.message,
        status: 'pending',
        paymentUrl: result.paymentUrl,
        providerTransactionId: result.providerTransactionId,
      };
    }

    throw new BadRequestException(result.message || 'Erreur lors du paiement');
  }

  // Get withdrawal fee info for a user (used by frontend)
  async getWithdrawalFees(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Utilisateur introuvable');
    const feePercent = this.getWithdrawalFeePercent(user.tier);
    return {
      tier: user.tier,
      feePercent,
      tiers: {
        NORMAL: { feePercent: 10 },
        PREMIUM: { feePercent: 5 },
        VIP: { feePercent: 2 },
      },
    };
  }

  // Get tier upgrade pricing
  getTierPricing() {
    return {
      PREMIUM: { price: this.configService.get<number>('PREMIUM_PRICE_FCFA') || 10000 },
      VIP: { price: this.configService.get<number>('VIP_PRICE_FCFA') || 25000 },
    };
  }
}
