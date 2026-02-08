import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async getWallet(userId: string) {
    return this.prisma.wallet.findUnique({ where: { userId } });
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
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Utilisateur introuvable');
    if (user.status === 'ACTIVATED') throw new BadRequestException('Compte déjà activé');

    const price = this.configService.get<number>('ACTIVATION_PRICE_FCFA') || 4000;

    // En mode mock, on active directement
    const paymentMode = this.configService.get('PAYMENT_MODE');
    if (paymentMode === 'mock') {
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
            description: 'Activation du compte (mock)',
          },
        }),
      ]);
      return { success: true, message: 'Compte activé avec succès' };
    }

    // TODO: Intégration paiement réel
    throw new BadRequestException('Paiement réel non encore implémenté');
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

    // Transaction atomique
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
        },
      });

      return withdrawal;
    });

    return result;
  }

  async getWithdrawals(userId: string) {
    return this.prisma.withdrawal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Admin: stats globales
  async getGlobalStats() {
    const [totalBalance, totalWithdrawals, pendingWithdrawals] = await Promise.all([
      this.prisma.wallet.aggregate({ _sum: { balance: true } }),
      this.prisma.withdrawal.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      this.prisma.withdrawal.count({ where: { status: 'PENDING' } }),
    ]);

    return {
      totalBalance: totalBalance._sum.balance || 0,
      totalWithdrawals: totalWithdrawals._sum.amount || 0,
      pendingWithdrawals,
    };
  }
}
