import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { BadgeCategory } from '@xearn/types';
import type { Decimal } from '@prisma/client/runtime/library';

const BadgeCategories = {
  STREAK: 'STREAK',
  TASKS: 'TASKS',
  REFERRALS: 'REFERRALS',
  EARNINGS: 'EARNINGS',
} as const;

type BadgeRecord = {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  threshold: number;
  reward: number | Decimal | null;
};

type UserBadgeEntry = {
  badgeId: string;
  earnedAt: Date;
};

type BadgeSeed = Omit<BadgeRecord, 'id'>;

/** Default badge definitions — seeded on first access. */
const DEFAULT_BADGES: BadgeSeed[] = [
  // Streak badges
  {
    code: 'streak_3',
    name: '🔥 3 jours',
    description: "3 jours consécutifs d'activité",
    icon: '🔥',
    category: 'STREAK',
    threshold: 3,
    reward: 100,
  },
  {
    code: 'streak_7',
    name: '🔥 Semaine parfaite',
    description: "7 jours consécutifs d'activité",
    icon: '🔥',
    category: 'STREAK',
    threshold: 7,
    reward: 300,
  },
  {
    code: 'streak_30',
    name: '💎 Mois complet',
    description: "30 jours consécutifs d'activité",
    icon: '💎',
    category: 'STREAK',
    threshold: 30,
    reward: 1500,
  },
  {
    code: 'streak_100',
    name: '👑 Centurion',
    description: "100 jours consécutifs d'activité",
    icon: '👑',
    category: 'STREAK',
    threshold: 100,
    reward: 5000,
  },
  // Task badges
  {
    code: 'tasks_10',
    name: '⚡ Débutant',
    description: '10 tâches complétées',
    icon: '⚡',
    category: 'TASKS',
    threshold: 10,
    reward: 200,
  },
  {
    code: 'tasks_50',
    name: '🏆 Travailleur',
    description: '50 tâches complétées',
    icon: '🏆',
    category: 'TASKS',
    threshold: 50,
    reward: 500,
  },
  {
    code: 'tasks_200',
    name: '🌟 Expert',
    description: '200 tâches complétées',
    icon: '🌟',
    category: 'TASKS',
    threshold: 200,
    reward: 2000,
  },
  {
    code: 'tasks_500',
    name: '🎯 Maître',
    description: '500 tâches complétées',
    icon: '🎯',
    category: 'TASKS',
    threshold: 500,
    reward: 5000,
  },
  // Referral badges
  {
    code: 'referrals_3',
    name: '🤝 Ambassadeur',
    description: '3 filleuls actifs',
    icon: '🤝',
    category: 'REFERRALS',
    threshold: 3,
    reward: 500,
  },
  {
    code: 'referrals_10',
    name: '📢 Influenceur',
    description: '10 filleuls actifs',
    icon: '📢',
    category: 'REFERRALS',
    threshold: 10,
    reward: 2000,
  },
  {
    code: 'referrals_50',
    name: '🌍 Leader',
    description: '50 filleuls actifs',
    icon: '🌍',
    category: 'REFERRALS',
    threshold: 50,
    reward: 10000,
  },
  // Earnings badges
  {
    code: 'earnings_5000',
    name: '💰 Premier palier',
    description: '5 000 FCFA gagnés au total',
    icon: '💰',
    category: 'EARNINGS',
    threshold: 5000,
    reward: 200,
  },
  {
    code: 'earnings_50000',
    name: '💵 Investisseur',
    description: '50 000 FCFA gagnés au total',
    icon: '💵',
    category: 'EARNINGS',
    threshold: 50000,
    reward: 1000,
  },
  {
    code: 'earnings_500000',
    name: '🏦 Millionnaire',
    description: '500 000 FCFA gagnés au total',
    icon: '🏦',
    category: 'EARNINGS',
    threshold: 500000,
    reward: 5000,
  },
];

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);
  private badgesSeeded = false;
  // MAJEUR FIX #1: Daily cap pour limiter l'exposition financière
  private readonly DAILY_BADGE_REWARD_CAP = 10000; // 10k FCFA/jour max par utilisateur

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Ensure default badges exist in DB (idempotent).
   */
  async ensureBadgesSeeded(): Promise<void> {
    if (this.badgesSeeded) return;

    for (const badge of DEFAULT_BADGES) {
      await this.prisma.badge.upsert({
        where: { code: badge.code },
        update: {},
        create: badge,
      });
    }
    this.badgesSeeded = true;
    this.logger.log(`Seeded ${DEFAULT_BADGES.length} default badges`);
  }

  /**
   * Record daily activity for a user and update streak.
   * Should be called after task completion.
   */
  async recordActivity(userId: string): Promise<{ currentStreak: number; newBadges: string[] }> {
    await this.ensureBadgesSeeded();

    const today = this.getDateOnly(new Date());

    const streak = await this.prisma.userStreak.upsert({
      where: { userId },
      create: { userId, currentStreak: 1, longestStreak: 1, lastActivityDate: today },
      update: {},
    });

    // Already recorded for today
    if (streak.lastActivityDate && this.isSameDay(streak.lastActivityDate, today)) {
      return { currentStreak: streak.currentStreak, newBadges: [] };
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let newStreak: number;
    if (streak.lastActivityDate && this.isSameDay(streak.lastActivityDate, yesterday)) {
      // Consecutive day
      newStreak = streak.currentStreak + 1;
    } else {
      // Streak broken or first activity
      newStreak = 1;
    }

    const newLongest = Math.max(streak.longestStreak, newStreak);

    await this.prisma.userStreak.update({
      where: { userId },
      data: {
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastActivityDate: today,
      },
    });

    // Check for new streak badges
    const newBadges = await this.checkAndAwardBadges(userId, BadgeCategories.STREAK, newStreak);

    return { currentStreak: newStreak, newBadges };
  }

  /**
   * Check and award task-count badges after a task is completed.
   */
  async checkTaskBadges(userId: string): Promise<string[]> {
    await this.ensureBadgesSeeded();
    const taskCount = await this.prisma.taskCompletion.count({ where: { userId } });
    return this.checkAndAwardBadges(userId, BadgeCategories.TASKS, taskCount);
  }

  /**
   * Check and award referral badges.
   */
  async checkReferralBadges(userId: string): Promise<string[]> {
    await this.ensureBadgesSeeded();
    const referralCount = await this.prisma.user.count({ where: { referredById: userId } });
    return this.checkAndAwardBadges(userId, BadgeCategories.REFERRALS, referralCount);
  }

  /**
   * Check and award earnings badges.
   */
  async checkEarningsBadges(userId: string): Promise<string[]> {
    await this.ensureBadgesSeeded();
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { totalEarned: true },
    });
    if (!wallet) return [];
    return this.checkAndAwardBadges(userId, BadgeCategories.EARNINGS, Number(wallet.totalEarned));
  }

  /**
   * Get the streak info for a user.
   */
  async getStreak(userId: string) {
    const streak = await this.prisma.userStreak.findUnique({ where: { userId } });
    if (!streak) {
      return { currentStreak: 0, longestStreak: 0, lastActivityDate: null };
    }

    // Check if streak is still valid (not missed yesterday)
    const today = this.getDateOnly(new Date());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isActive =
      streak.lastActivityDate &&
      (this.isSameDay(streak.lastActivityDate, today) ||
        this.isSameDay(streak.lastActivityDate, yesterday));

    return {
      currentStreak: isActive ? streak.currentStreak : 0,
      longestStreak: streak.longestStreak,
      lastActivityDate: streak.lastActivityDate,
    };
  }

  /**
   * Get all badges for a user (earned + available).
   */
  async getUserBadges(userId: string) {
    await this.ensureBadgesSeeded();

    const [allBadges, userBadges]: [BadgeRecord[], UserBadgeEntry[]] = await Promise.all([
      this.prisma.badge.findMany({ orderBy: [{ category: 'asc' }, { threshold: 'asc' }] }),
      this.prisma.userBadge.findMany({
        where: { userId },
        select: { badgeId: true, earnedAt: true },
      }),
    ]);

    const earnedMap = new Map(userBadges.map((ub) => [ub.badgeId, ub.earnedAt]));

    return allBadges.map((badge) => ({
      ...badge,
      earned: earnedMap.has(badge.id),
      earnedAt: earnedMap.get(badge.id) ?? null,
    }));
  }

  /**
   * Leaderboard — top users by streak.
   */
  async getStreakLeaderboard(limit = 20) {
    return this.prisma.userStreak.findMany({
      where: { currentStreak: { gt: 0 } },
      orderBy: { currentStreak: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, tier: true },
        },
      },
    });
  }

  // --- Private helpers ---

  private async checkAndAwardBadges(
    userId: string,
    category: BadgeCategory,
    currentValue: number,
  ): Promise<string[]> {
    const newBadgeNames: string[] = [];

    // MAJEUR FIX #1: Vérifier le total de rewards badges déjà reçus aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayRewards = await this.prisma.transaction.aggregate({
      where: {
        userId,
        type: 'TASK_EARNING',
        description: { startsWith: 'Bonus badge:' },
        createdAt: { gte: today },
      },
      _sum: { amount: true },
    });

    const totalToday = Number(todayRewards._sum.amount || 0);

    if (totalToday >= this.DAILY_BADGE_REWARD_CAP) {
      this.logger.warn(
        `Badge reward cap atteint pour ${userId} (${totalToday} FCFA aujourd'hui) - badges bloqués`,
      );
      return [];
    }

    // CRITIQUE FIX #1: Lock wallet BEFORE reading unearned badges to prevent race conditions
    await this.prisma.$transaction(async (tx) => {
      // 1. Lock wallet first to serialize badge operations per user
      await tx.$queryRaw`SELECT 1 FROM "wallets" WHERE "userId" = ${userId} FOR UPDATE`;

      // 2. Now read unearned badges (under lock)
      const unearned = await tx.badge.findMany({
        where: {
          category,
          threshold: { lte: currentValue },
          NOT: {
            userBadges: { some: { userId } },
          },
        },
      });

      // 3. Award badges atomically (with cap enforcement)
      for (const badge of unearned) {
        try {
          if (badge.reward) {
            // MAJEUR FIX #1: Vérifier que l'ajout ne dépasse pas le cap quotidien
            const newTotal = totalToday + Number(badge.reward);
            if (newTotal > this.DAILY_BADGE_REWARD_CAP) {
              this.logger.warn(
                `Badge ${badge.code} ignoré pour ${userId} - dépasserait le cap quotidien (${newTotal} > ${this.DAILY_BADGE_REWARD_CAP})`,
              );
              continue; // Skip this badge
            }

            await tx.userBadge.create({
              data: { userId, badgeId: badge.id },
            });
            await tx.wallet.update({
              where: { userId },
              data: {
                balance: { increment: badge.reward },
                totalEarned: { increment: badge.reward },
              },
            });
            await tx.transaction.create({
              data: {
                userId,
                type: 'TASK_EARNING',
                status: 'COMPLETED',
                amount: badge.reward,
                description: `Bonus badge: ${badge.name}`,
                metadata: { badgeCode: badge.code, category },
              },
            });
          } else {
            await tx.userBadge.create({
              data: { userId, badgeId: badge.id },
            });
          }

          newBadgeNames.push(badge.name);
        } catch (err: unknown) {
          // P2002 = already awarded by a previous request that committed
          if (
            typeof err === 'object' &&
            err !== null &&
            'code' in err &&
            (err as { code?: string }).code === 'P2002'
          ) {
            this.logger.debug(`Badge ${badge.code} already awarded to ${userId} (concurrent)`);
            continue;
          }
          throw err;
        }
      }
    });

    // Notifications outside transaction (non-critical)
    for (const badgeName of newBadgeNames) {
      const badge = await this.prisma.badge.findFirst({ where: { name: badgeName } });
      if (!badge) continue;

      try {
        await this.notificationsService.create(
          userId,
          'SYSTEM',
          `Badge débloqué : ${badge.name}`,
          `Félicitations ! Vous avez obtenu le badge "${badge.name}" — ${badge.description}${badge.reward ? `. Bonus : ${badge.reward} FCFA` : ''}`,
          { badgeCode: badge.code, badgeIcon: badge.icon },
        );
      } catch (err) {
        this.logger.error(`Failed to notify badge: ${err}`);
      }
    }

    return newBadgeNames;
  }

  /** Normalize a date to midnight UTC */
  private getDateOnly(date: Date): Date {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  }

  /** Check if two dates fall on the same calendar day (UTC) */
  private isSameDay(a: Date, b: Date): boolean {
    const da = new Date(a);
    const db = new Date(b);
    return (
      da.getUTCFullYear() === db.getUTCFullYear() &&
      da.getUTCMonth() === db.getUTCMonth() &&
      da.getUTCDate() === db.getUTCDate()
    );
  }
}
