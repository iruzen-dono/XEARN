import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';
import { PaymentService } from '../payment/payment.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private paymentService: PaymentService,
    private notificationsService: NotificationsService,
  ) {}

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
      totalWithdrawn: completedWithdrawals._sum?.amount || 0,
      pendingWithdrawal: pendingWithdrawals._sum?.amount || 0,
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
    if (!user) throw new BadRequestException('Utilisateur introuvable');
    if (user.status === 'ACTIVATED') throw new BadRequestException('Compte déjà activé');
    if (user.status === 'SUSPENDED' || user.status === 'BANNED') {
      throw new BadRequestException('Compte suspendu ou banni — contactez le support');
    }

    const price = this.configService.get<number>('ACTIVATION_PRICE_FCFA') || 4000;
    const provider = this.paymentService.getProvider();

    const result = await provider.collect({
      amount: price,
      description: `Activation du compte XEARN — ${user.firstName} ${user.lastName}`,
      customerEmail: user.email || undefined,
      customerName: `${user.firstName} ${user.lastName}`,
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
      } catch (err) { /* ignore */ }
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

  async requestWithdrawal(userId: string, amount: number, method: string, accountInfo: string) {
    const minWithdrawal = this.configService.get<number>('WITHDRAWAL_MIN_FCFA') || 2000;

    if (amount < minWithdrawal) {
      throw new BadRequestException(`Montant minimum de retrait: ${minWithdrawal} FCFA`);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!user || user.status !== 'ACTIVATED') {
      throw new BadRequestException('Compte non activé');
    }

    if (!user.wallet || user.wallet.balance.lessThan(new Decimal(amount))) {
      throw new BadRequestException('Solde insuffisant');
    }

    const provider = this.paymentService.getProvider();

    // Transaction atomique : débiter le wallet + créer le retrait
    const result = await this.prisma.$transaction(async (tx) => {
      // Débiter le wallet
      await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: amount } },
      });

      // Créer le retrait
      const withdrawal = await tx.withdrawal.create({
        data: {
          userId,
          amount,
          method: method as any,
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
          description: `Retrait via ${method}`,
          metadata: { withdrawalId: withdrawal.id },
        },
      });

      return withdrawal;
    });

    // Lancer le décaissement réel (hors transaction DB)
    try {
      const disbursement = await provider.disburse({
        amount,
        method,
        accountInfo,
        recipientName: `${user.firstName} ${user.lastName}`,
        callbackMeta: { withdrawalId: result.id, userId },
      });

      if (disbursement.status === 'completed') {
        // Mock — marquer comme complété immédiatement
        await this.prisma.$transaction([
          this.prisma.withdrawal.update({
            where: { id: result.id },
            data: { status: 'COMPLETED', processedAt: new Date() },
          }),
          this.prisma.transaction.updateMany({
            where: { userId, type: 'WITHDRAWAL', status: 'PENDING' },
            data: { status: 'COMPLETED' },
          }),
        ]);
      }

      return {
        withdrawal: result,
        paymentStatus: disbursement.status,
        message: disbursement.message,
      };
    } catch (error: any) {
      // En cas d'erreur du provider, le retrait reste PENDING
      return {
        withdrawal: result,
        paymentStatus: 'pending',
        message: 'Retrait créé — en attente de traitement',
      };
    }
  }

  async getWithdrawals(userId: string) {
    return this.prisma.withdrawal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Admin: stats globales
  async getGlobalStats() {
    const [totalBalance, totalWithdrawals, pendingWithdrawals, completedWithdrawals, totalRevenue, totalTransactions] = await Promise.all([
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
    const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
    if (!withdrawal) throw new BadRequestException('Retrait introuvable');
    if (withdrawal.status !== 'PENDING') throw new BadRequestException('Retrait déjà traité');

    const result = await this.prisma.$transaction([
      this.prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'COMPLETED', processedAt: new Date() },
      }),
      this.prisma.transaction.updateMany({
        where: { metadata: { path: ['withdrawalId'], equals: withdrawalId }, type: 'WITHDRAWAL', status: 'PENDING' },
        data: { status: 'COMPLETED' },
      }),
    ]);

    // Notification
    try {
      await this.notificationsService.notifyWithdrawalApproved(withdrawal.userId, Number(withdrawal.amount));
    } catch (err) { /* ignore */ }

    return result;
  }

  // Admin: rejeter un retrait (rembourser)
  async rejectWithdrawal(withdrawalId: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
    if (!withdrawal) throw new BadRequestException('Retrait introuvable');
    if (withdrawal.status !== 'PENDING') throw new BadRequestException('Retrait déjà traité');

    const result = await this.prisma.$transaction([
      this.prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'FAILED' },
      }),
      this.prisma.wallet.update({
        where: { userId: withdrawal.userId },
        data: { balance: { increment: withdrawal.amount } },
      }),
      this.prisma.transaction.updateMany({
        where: { metadata: { path: ['withdrawalId'], equals: withdrawalId }, type: 'WITHDRAWAL', status: 'PENDING' },
        data: { status: 'FAILED' },
      }),
    ]);

    // Notification
    try {
      await this.notificationsService.notifyWithdrawalRejected(withdrawal.userId, Number(withdrawal.amount));
    } catch (err) { /* ignore */ }

    return result;
  }
}
