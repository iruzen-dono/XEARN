import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ReferralsService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async getReferralTree(userId: string) {
    // Niveau 1 : filleuls directs
    const level1 = await this.prisma.user.findMany({
      where: { referredById: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        status: true,
        createdAt: true,
      },
    });

    // Niveau 2 : filleuls des filleuls
    const level1Ids = level1.map((u) => u.id);
    const level2 = await this.prisma.user.findMany({
      where: { referredById: { in: level1Ids } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        status: true,
        createdAt: true,
        referredById: true,
      },
    });

    return { level1, level2 };
  }

  async getCommissions(userId: string) {
    return this.prisma.commission.findMany({
      where: { beneficiaryId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStats(userId: string) {
    const [totalLevel1, totalLevel2, totalCommissions] = await Promise.all([
      this.prisma.user.count({ where: { referredById: userId } }),
      this.prisma.user.count({
        where: {
          referredBy: { referredById: userId },
        },
      }),
      this.prisma.commission.aggregate({
        where: { beneficiaryId: userId },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalLevel1,
      totalLevel2,
      totalCommissions: totalCommissions._sum.amount || new Decimal(0),
    };
  }

  // Distribuer les commissions quand un filleul gagne de l'argent
  async distributeCommissions(userId: string, amount: Decimal) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        referredBy: {
          include: { referredBy: true },
        },
      },
    });

    if (!user?.referredBy) return;

    const l1Percent = this.configService.get<number>('REFERRAL_LEVEL1_PERCENT') || 40;
    const l2Percent = this.configService.get<number>('REFERRAL_LEVEL2_PERCENT') || 10;

    // Commission niveau 1
    if (user.referredBy.status === 'ACTIVATED') {
      const commissionL1 = amount.mul(l1Percent).div(100);

      await this.prisma.$transaction([
        this.prisma.commission.create({
          data: {
            beneficiaryId: user.referredBy.id,
            sourceUserId: userId,
            level: 1,
            percentage: l1Percent,
            amount: commissionL1,
          },
        }),
        this.prisma.wallet.update({
          where: { userId: user.referredBy.id },
          data: {
            balance: { increment: commissionL1 },
            totalEarned: { increment: commissionL1 },
          },
        }),
        this.prisma.transaction.create({
          data: {
            userId: user.referredBy.id,
            type: 'REFERRAL_L1',
            status: 'COMPLETED',
            amount: commissionL1,
            description: `Commission N1 - ${user.firstName} ${user.lastName}`,
          },
        }),
      ]);
    }

    // Commission niveau 2
    if (user.referredBy.referredBy?.status === 'ACTIVATED') {
      const commissionL2 = amount.mul(l2Percent).div(100);

      await this.prisma.$transaction([
        this.prisma.commission.create({
          data: {
            beneficiaryId: user.referredBy.referredBy.id,
            sourceUserId: userId,
            level: 2,
            percentage: l2Percent,
            amount: commissionL2,
          },
        }),
        this.prisma.wallet.update({
          where: { userId: user.referredBy.referredBy.id },
          data: {
            balance: { increment: commissionL2 },
            totalEarned: { increment: commissionL2 },
          },
        }),
        this.prisma.transaction.create({
          data: {
            userId: user.referredBy.referredBy.id,
            type: 'REFERRAL_L2',
            status: 'COMPLETED',
            amount: commissionL2,
            description: `Commission N2 - ${user.firstName} ${user.lastName}`,
          },
        }),
      ]);
    }
  }
}
