import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Admin - Analytics')
export class AnalyticsController {
  constructor(
    private analyticsService: AnalyticsService,
    private prisma: PrismaService,
  ) {}

  @Get('overview')
  @Roles('ADMIN')
  async getDashboardOverview() {
    const [totalUsers, activeUsers, totalRevenue, totalPayouts] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.analyticsService.getTotalRevenue(),
      this.analyticsService.getTotalPayouts(),
    ]);

    const revenue = Number(totalRevenue);
    const payouts = Number(totalPayouts);

    return {
      totalUsers,
      activeUsers,
      activeUserPercentage: totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(2) : '0',
      totalRevenue,
      totalPayouts,
      netProfit: (revenue - payouts).toFixed(2),
    };
  }

  @Get('user-growth')
  @Roles('ADMIN')
  @ApiQuery({ name: 'days', required: false })
  async getUserGrowth(@Query('days') days: string = '30') {
    return this.analyticsService.getUserGrowthChart(Number(days) || 30);
  }

  @Get('revenue-breakdown')
  @Roles('ADMIN')
  async getRevenueBreakdown() {
    const [ads, tasks, premium, referrals] = await Promise.all([
      this.analyticsService.getRevenueBySource('ads'),
      this.analyticsService.getRevenueBySource('tasks'),
      this.analyticsService.getRevenueBySource('premium'),
      this.analyticsService.getRevenueBySource('referrals'),
    ]);

    const total = Number(ads) + Number(tasks) + Number(premium) + Number(referrals);

    return { ads, tasks, premium, referrals, total: total.toFixed(2) };
  }

  @Get('top-earners')
  @Roles('ADMIN')
  @ApiQuery({ name: 'limit', required: false })
  async getTopEarners(@Query('limit') limit: string = '10') {
    return this.analyticsService.getTopEarners(Number(limit) || 10);
  }

  @Get('referral-stats')
  @Roles('ADMIN')
  async getReferralStats() {
    const [totalReferrals, referralsEarnings] = await Promise.all([
      this.prisma.user.count({ where: { referredById: { not: null } } }),
      this.analyticsService.getReferralEarnings(),
    ]);

    return {
      totalReferrals,
      referralsEarnings,
      averageEarningsPerReferral:
        totalReferrals > 0 ? (Number(referralsEarnings) / totalReferrals).toFixed(2) : '0',
    };
  }

  @Get('export/users')
  @Roles('ADMIN')
  async exportUsers(@Res() res: Response) {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        tier: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const csv = this.analyticsService.generateCSV(users as unknown as Record<string, unknown>[], [
      'id',
      'email',
      'firstName',
      'lastName',
      'tier',
      'status',
      'createdAt',
    ]);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
    res.send(csv);
  }

  @Get('export/transactions')
  @Roles('ADMIN')
  async exportTransactions(@Res() res: Response) {
    const transactions = await this.prisma.transaction.findMany({
      select: {
        id: true,
        userId: true,
        type: true,
        amount: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    const csv = this.analyticsService.generateCSV(
      transactions as unknown as Record<string, unknown>[],
      ['id', 'userId', 'type', 'amount', 'status', 'createdAt'],
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
    res.send(csv);
  }

  @Get('export/payouts')
  @Roles('ADMIN')
  async exportPayouts(@Res() res: Response) {
    const payouts = await this.prisma.withdrawal.findMany({
      select: {
        id: true,
        userId: true,
        amount: true,
        method: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    const csv = this.analyticsService.generateCSV(payouts as unknown as Record<string, unknown>[], [
      'id',
      'userId',
      'amount',
      'method',
      'status',
      'createdAt',
    ]);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="payouts.csv"');
    res.send(csv);
  }
}
