import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface FingerprintData {
  fingerprint: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AntiCheatService {
  private readonly logger = new Logger(AntiCheatService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Record a device fingerprint for a user login/register.
   * Returns suspicious accounts sharing the same fingerprint or IP.
   */
  async recordFingerprint(userId: string, data: FingerprintData) {
    if (!data.fingerprint) return { suspicious: false, matchedAccounts: [] };

    // Upsert the fingerprint
    await this.prisma.deviceFingerprint.upsert({
      where: {
        userId_fingerprint: { userId, fingerprint: data.fingerprint },
      },
      update: {
        lastSeenAt: new Date(),
        ipAddress: data.ipAddress || undefined,
        userAgent: data.userAgent || undefined,
      },
      create: {
        userId,
        fingerprint: data.fingerprint,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
    });

    // Check for other accounts with the same fingerprint
    const matchedByFingerprint = await this.prisma.deviceFingerprint.findMany({
      where: {
        fingerprint: data.fingerprint,
        userId: { not: userId },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    // Check for other accounts with the same IP (if available)
    let matchedByIp: { userId: string }[] = [];
    if (data.ipAddress) {
      matchedByIp = await this.prisma.deviceFingerprint.findMany({
        where: {
          ipAddress: data.ipAddress,
          userId: { not: userId },
        },
        select: { userId: true },
        distinct: ['userId'],
      });
    }

    // Merge unique user IDs
    const allMatched = new Set([
      ...matchedByFingerprint.map(m => m.userId),
      ...matchedByIp.map(m => m.userId),
    ]);

    if (allMatched.size > 0) {
      this.logger.warn(
        `Multi-account detected! User ${userId} shares fingerprint/IP with: ${[...allMatched].join(', ')}`,
      );
    }

    return {
      suspicious: allMatched.size > 0,
      matchedAccounts: [...allMatched],
    };
  }

  /**
   * Get all suspicious multi-account groups for admin review.
   */
  async getSuspiciousAccounts() {
    // Find fingerprints shared by multiple users
    const sharedFingerprints = await this.prisma.$queryRaw<
      { fingerprint: string; user_count: bigint; user_ids: string }[]
    >`
      SELECT fingerprint, COUNT(DISTINCT "userId") as user_count,
             STRING_AGG(DISTINCT "userId", ',') as user_ids
      FROM device_fingerprints
      GROUP BY fingerprint
      HAVING COUNT(DISTINCT "userId") > 1
      ORDER BY user_count DESC
      LIMIT 50
    `;

    // Get user details for each group
    const results = await Promise.all(
      sharedFingerprints.map(async (sf) => {
        const userIds = sf.user_ids.split(',');
        const users = await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
            createdAt: true,
          },
        });
        return {
          fingerprint: sf.fingerprint,
          accountCount: Number(sf.user_count),
          users,
        };
      }),
    );

    return results;
  }

  /**
   * Get fingerprint history for a specific user (admin).
   */
  async getUserFingerprints(userId: string) {
    return this.prisma.deviceFingerprint.findMany({
      where: { userId },
      orderBy: { lastSeenAt: 'desc' },
    });
  }
}
