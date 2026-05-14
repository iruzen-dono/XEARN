import { Injectable } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getTotalRevenue(): Promise<string> {
    const result = await this.prisma.transaction.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true },
    });
    return result._sum?.amount?.toString() || '0';
  }

  async getTotalPayouts(): Promise<string> {
    const result = await this.prisma.withdrawal.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true },
    });
    return result._sum?.amount?.toString() || '0';
  }

  async getUserGrowthChart(days: number) {
    const safeDays = Math.max(1, Math.min(Math.floor(days), 365));
    const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);

    const result: { date: Date; count: bigint }[] = await this.prisma.$queryRawUnsafe(
      `SELECT DATE("createdAt") as date, COUNT(*)::bigint as count
       FROM users
       WHERE "createdAt" >= $1
       GROUP BY DATE("createdAt")
       ORDER BY date ASC`,
      since,
    );

    return result.map((r: { date: Date; count: bigint }) => ({
      date: new Date(r.date).toISOString().split('T')[0],
      users: Number(r.count),
    }));
  }

  async getRevenueBySource(source: string): Promise<string> {
    const typeMap: Record<string, TransactionType[]> = {
      ads: ['PUB_MAKER'],
      tasks: ['TASK_EARNING'],
      premium: ['TIER_UPGRADE', 'ACTIVATION'],
      referrals: ['REFERRAL_L1', 'REFERRAL_L2', 'REFERRAL_L3'],
    };

    const types = typeMap[source];
    if (!types || types.length === 0) return '0';

    const result = await this.prisma.transaction.aggregate({
      where: {
        type: { in: types },
        status: 'COMPLETED',
      },
      _sum: { amount: true },
    });

    return result._sum?.amount?.toString() || '0';
  }

  async getTopEarners(limit: number) {
    const safeLimit = Math.max(1, Math.min(Math.floor(limit), 100));

    const result = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        wallet: {
          select: { totalEarned: true },
        },
      },
      orderBy: {
        wallet: { totalEarned: 'desc' },
      },
      take: safeLimit,
    });

    return result.map(
      (u: {
        id: string;
        email: string | null;
        firstName: string;
        wallet: { totalEarned: any } | null;
      }) => ({
        id: u.id,
        email: u.email,
        name: u.firstName,
        totalEarned: u.wallet?.totalEarned?.toString() || '0',
      }),
    );
  }

  async getReferralEarnings(): Promise<string> {
    const result = await this.prisma.commission.aggregate({
      _sum: { amount: true },
    });
    return result._sum?.amount?.toString() || '0';
  }

  generateCSV(data: Record<string, unknown>[], columns: string[]): string {
    const header = columns.join(',');
    if (data.length === 0) return header + '\n';

    const rows = data.map((row) =>
      columns
        .map((col) => {
          const value = row[col];
          if (value === null || value === undefined) return '';
          const str = String(value);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(','),
    );

    return [header, ...rows].join('\n') + '\n';
  }
}
