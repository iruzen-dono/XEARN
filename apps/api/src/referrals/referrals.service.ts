import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { GamificationService } from '../gamification/gamification.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private notificationsService: NotificationsService,
    private gamificationService: GamificationService,
  ) {
    // Validate commission percentages at startup
    const l1 = this.configService.get<number>('REFERRAL_LEVEL1_PERCENT') || 40;
    const l2 = this.configService.get<number>('REFERRAL_LEVEL2_PERCENT') || 10;
    const l3 = this.configService.get<number>('REFERRAL_LEVEL3_PERCENT') || 5;
    if (l1 < 0 || l1 > 50 || l2 < 0 || l2 > 50 || l3 < 0 || l3 > 50) {
      throw new Error('REFERRAL_LEVEL*_PERCENT must be between 0 and 50');
    }
    if (l1 + l2 + l3 > 100) {
      throw new Error('Total referral commission percentages must not exceed 100%');
    }
  }

  async getReferralTree(userId: string) {
    const MAX_PER_LEVEL = 100;

    const level1 = await this.prisma.user.findMany({
      where: { referredById: userId },
      select: { id: true, firstName: true, lastName: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: MAX_PER_LEVEL,
    });

    const level1Ids = level1.map((u: { id: string }) => u.id);
    const level2 =
      level1Ids.length > 0
        ? await this.prisma.user.findMany({
            where: { referredById: { in: level1Ids } },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              status: true,
              createdAt: true,
              referredById: true,
            },
            orderBy: { createdAt: 'desc' },
            take: MAX_PER_LEVEL,
          })
        : ([] as {
            id: string;
            firstName: string;
            lastName: string;
            status: string;
            createdAt: Date;
            referredById: string | null;
          }[]);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });

    let level3: typeof level2 = [];
    if (user?.tier === 'VIP' && level2.length > 0) {
      const level2Ids = level2.map((u: { id: string }) => u.id);
      level3 = await this.prisma.user.findMany({
        where: { referredById: { in: level2Ids } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          status: true,
          createdAt: true,
          referredById: true,
        },
        orderBy: { createdAt: 'desc' },
        take: MAX_PER_LEVEL,
      });
    }

    return { level1, level2, level3 };
  }

  async getCommissions(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [commissions, total] = await Promise.all([
      this.prisma.commission.findMany({
        where: { beneficiaryId: userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          sourceUser: {
            select: { firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.commission.count({ where: { beneficiaryId: userId } }),
    ]);
    return { commissions, total, page, limit };
  }

  async getStats(userId: string) {
    const l1Percent = this.configService.get<number>('REFERRAL_LEVEL1_PERCENT') || 40;
    const l2Percent = this.configService.get<number>('REFERRAL_LEVEL2_PERCENT') || 10;
    const l3Percent = this.configService.get<number>('REFERRAL_LEVEL3_PERCENT') || 5;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });

    const [
      totalLevel1,
      totalLevel2,
      totalLevel3,
      totalCommissions,
      commissionsL1,
      commissionsL2,
      commissionsL3,
    ] = await Promise.all([
      this.prisma.user.count({ where: { referredById: userId } }),
      this.prisma.user.count({
        where: {
          referredBy: { referredById: userId },
        },
      }),
      // Level 3 count (relevant for VIP)
      this.prisma.user.count({
        where: {
          referredBy: { referredBy: { referredById: userId } },
        },
      }),
      this.prisma.commission.aggregate({
        where: { beneficiaryId: userId },
        _sum: { amount: true },
      }),
      this.prisma.commission.aggregate({
        where: { beneficiaryId: userId, level: 1 },
        _sum: { amount: true },
      }),
      this.prisma.commission.aggregate({
        where: { beneficiaryId: userId, level: 2 },
        _sum: { amount: true },
      }),
      this.prisma.commission.aggregate({
        where: { beneficiaryId: userId, level: 3 },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalLevel1,
      totalLevel2,
      totalLevel3,
      totalCommissions: Number(totalCommissions._sum.amount || 0),
      commissionsL1: Number(commissionsL1._sum.amount || 0),
      commissionsL2: Number(commissionsL2._sum.amount || 0),
      commissionsL3: Number(commissionsL3._sum.amount || 0),
      l1Percent,
      l2Percent,
      l3Percent,
      userTier: user?.tier || 'NORMAL',
      l3Active: user?.tier === 'VIP',
    };
  }

  // Distribuer les commissions quand un filleul gagne de l'argent
  async distributeCommissions(userId: string, amount: Decimal, completionId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        referredBy: {
          select: {
            id: true,
            status: true,
            tier: true,
            firstName: true,
            lastName: true,
            referredBy: {
              select: {
                id: true,
                status: true,
                tier: true,
                firstName: true,
                lastName: true,
                referredBy: {
                  select: { id: true, status: true, tier: true, firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user?.referredBy) return;

    const l1Percent = this.configService.get<number>('REFERRAL_LEVEL1_PERCENT') || 40;
    const l2Percent = this.configService.get<number>('REFERRAL_LEVEL2_PERCENT') || 10;
    const l3Percent = this.configService.get<number>('REFERRAL_LEVEL3_PERCENT') || 5;

    // Determine eligible beneficiaries upfront
    const l1Beneficiary = user.referredBy!.status === 'ACTIVATED' ? user.referredBy! : null;
    const l2Beneficiary =
      user.referredBy!.referredBy?.status === 'ACTIVATED' &&
      user.referredBy!.referredBy?.tier &&
      ['PREMIUM', 'VIP'].includes(user.referredBy!.referredBy.tier)
        ? user.referredBy!.referredBy
        : null;
    const l3Beneficiary =
      user.referredBy!.referredBy?.referredBy?.status === 'ACTIVATED' &&
      user.referredBy!.referredBy?.referredBy?.tier === 'VIP'
        ? user.referredBy!.referredBy.referredBy
        : null;

    // Collect unique beneficiary IDs and sort for deterministic lock ordering (deadlock prevention)
    const beneficiaryIdsToLock = [
      ...(l1Beneficiary ? [l1Beneficiary.id] : []),
      ...(l2Beneficiary ? [l2Beneficiary.id] : []),
      ...(l3Beneficiary ? [l3Beneficiary.id] : []),
    ];
    const uniqueSortedIds = [...new Set(beneficiaryIdsToLock)].sort();

    if (uniqueSortedIds.length === 0) return;

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Lock ALL wallets upfront in sorted order to prevent deadlocks
      for (const id of uniqueSortedIds) {
        await tx.$queryRaw`SELECT 1 FROM "wallets" WHERE "userId" = ${id} FOR UPDATE`;
      }

      // Commission niveau 1
      if (l1Beneficiary) {
        const commissionL1 = amount.mul(l1Percent).div(100);
        await tx.commission.create({
          data: {
            beneficiaryId: l1Beneficiary.id,
            sourceUserId: userId,
            level: 1,
            percentage: l1Percent,
            amount: commissionL1,
            sourceType: 'TASK_COMPLETION',
            sourceId: completionId || userId,
          },
        });
        await tx.wallet.update({
          where: { userId: l1Beneficiary.id },
          data: {
            balance: { increment: commissionL1 },
            totalEarned: { increment: commissionL1 },
          },
        });
        await tx.transaction.create({
          data: {
            userId: l1Beneficiary.id,
            type: 'REFERRAL_L1',
            status: 'COMPLETED',
            amount: commissionL1,
            description: `Commission N1 - ${user.firstName} ${user.lastName}`,
          },
        });
      }

      // Commission niveau 2
      if (l2Beneficiary) {
        const commissionL2 = amount.mul(l2Percent).div(100);
        await tx.commission.create({
          data: {
            beneficiaryId: l2Beneficiary.id,
            sourceUserId: userId,
            level: 2,
            percentage: l2Percent,
            amount: commissionL2,
            sourceType: 'TASK_COMPLETION',
            sourceId: completionId || userId,
          },
        });
        await tx.wallet.update({
          where: { userId: l2Beneficiary.id },
          data: {
            balance: { increment: commissionL2 },
            totalEarned: { increment: commissionL2 },
          },
        });
        await tx.transaction.create({
          data: {
            userId: l2Beneficiary.id,
            type: 'REFERRAL_L2',
            status: 'COMPLETED',
            amount: commissionL2,
            description: `Commission N2 - ${user.firstName} ${user.lastName}`,
          },
        });
      }

      // Commission niveau 3 (VIP uniquement)
      if (l3Beneficiary) {
        const commissionL3 = amount.mul(l3Percent).div(100);
        await tx.commission.create({
          data: {
            beneficiaryId: l3Beneficiary.id,
            sourceUserId: userId,
            level: 3,
            percentage: l3Percent,
            amount: commissionL3,
            sourceType: 'TASK_COMPLETION',
            sourceId: completionId || userId,
          },
        });
        await tx.wallet.update({
          where: { userId: l3Beneficiary.id },
          data: {
            balance: { increment: commissionL3 },
            totalEarned: { increment: commissionL3 },
          },
        });
        await tx.transaction.create({
          data: {
            userId: l3Beneficiary.id,
            type: 'REFERRAL_L3',
            status: 'COMPLETED',
            amount: commissionL3,
            description: `Commission N3 VIP - ${user.firstName} ${user.lastName}`,
          },
        });
      }
    });

    // Notifications (outside transaction — non-critical)
    const l3BeneficiaryNotif = user.referredBy.referredBy?.referredBy;

    if (user.referredBy.status === 'ACTIVATED') {
      const commissionL1 = amount.mul(l1Percent).div(100);
      try {
        await this.notificationsService.notifyCommission(
          user.referredBy.id,
          Number(commissionL1),
          1,
          `${user.firstName} ${user.lastName}`,
        );
      } catch (err) {
        /* ignore */
      }
    }

    if (
      user.referredBy.referredBy?.status === 'ACTIVATED' &&
      ['PREMIUM', 'VIP'].includes(user.referredBy.referredBy.tier)
    ) {
      const commissionL2 = amount.mul(l2Percent).div(100);
      try {
        await this.notificationsService.notifyCommission(
          user.referredBy.referredBy.id,
          Number(commissionL2),
          2,
          `${user.firstName} ${user.lastName}`,
        );
      } catch {
        /* ignore */
      }
    }

    if (l3BeneficiaryNotif?.status === 'ACTIVATED' && l3BeneficiaryNotif.tier === 'VIP') {
      const commissionL3 = amount.mul(l3Percent).div(100);
      try {
        await this.notificationsService.notifyCommission(
          l3BeneficiaryNotif.id,
          Number(commissionL3),
          3,
          `${user.firstName} ${user.lastName}`,
        );
      } catch {
        /* ignore */
      }
    }

    // Check referral badges for all beneficiaries (parallel, non-critical)
    const beneficiaryIds = [
      user.referredBy.id,
      user.referredBy.referredBy?.id,
      l3BeneficiaryNotif?.id,
    ].filter(Boolean) as string[];

    await Promise.allSettled(
      beneficiaryIds.map((id) => this.gamificationService.checkReferralBadges(id)),
    );
  }
}
