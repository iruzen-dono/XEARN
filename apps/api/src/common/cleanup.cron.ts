import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CleanupCronService {
  private readonly logger = new Logger(CleanupCronService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupStaleSessions() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const { count } = await this.prisma.taskSession.deleteMany({
      where: {
        completed: false,
        startedAt: { lt: oneHourAgo },
      },
    });
    if (count > 0) {
      this.logger.log(`Cleaned up ${count} stale task sessions`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async expireOverdueTasks() {
    const now = new Date();
    const { count } = await this.prisma.task.updateMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lt: now },
      },
      data: { status: 'EXPIRED' },
    });
    if (count > 0) {
      this.logger.log(`Expired ${count} overdue tasks`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async purgeOldNotifications() {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const { count } = await this.prisma.notification.deleteMany({
      where: {
        read: true,
        createdAt: { lt: ninetyDaysAgo },
      },
    });
    if (count > 0) {
      this.logger.log(`Purged ${count} old read notifications`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_5AM)
  async cleanupExpiredTokens() {
    const now = new Date();
    const { count } = await this.prisma.user.updateMany({
      where: {
        OR: [
          { emailVerificationExpiresAt: { lt: now }, emailVerificationToken: { not: null } },
          { passwordResetExpiresAt: { lt: now }, passwordResetToken: { not: null } },
        ],
      },
      data: {
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
    });
    if (count > 0) {
      this.logger.log(`Cleaned up ${count} expired verification/reset tokens`);
    }
  }
}
