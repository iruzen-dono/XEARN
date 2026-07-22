import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  // ─── GET /admin/users ─────────────────────────────────────────────────

  async getUsers(page = 1, limit = 20, search?: string, status?: string, tier?: string) {
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status as any;
    }

    if (tier) {
      where.tier = tier as any;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        omit: { password: true },
        include: {
          wallet: {
            select: { balance: true },
          },
          streak: {
            select: { currentStreak: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Convertir les Decimals Prisma en number pour la sérialisation JSON
    const serializedUsers = users.map((user) => ({
      ...user,
      wallet: user.wallet ? { balance: Number(user.wallet.balance) } : null,
      streak: user.streak ?? null,
    }));

    return {
      users: serializedUsers,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─── GET /admin/stats ─────────────────────────────────────────────────

  async getStats() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalUsers,
      activatedUsers,
      premiumUsers,
      vipUsers,
      totalEarningsResult,
      totalWithdrawalsResult,
      pendingWithdrawals,
      totalTasksCompleted,
      activeStreaks,
      usersByDayRaw,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null, status: 'ACTIVATED' } }),
      this.prisma.user.count({ where: { deletedAt: null, tier: 'PREMIUM' } }),
      this.prisma.user.count({ where: { deletedAt: null, tier: 'VIP' } }),
      this.prisma.wallet.aggregate({
        _sum: { totalEarned: true },
      }),
      this.prisma.withdrawal.aggregate({
        _sum: { amount: true },
        where: { status: 'COMPLETED' },
      }),
      this.prisma.withdrawal.count({ where: { status: 'PENDING' } }),
      this.prisma.taskCompletion.count(),
      this.prisma.userStreak.count({ where: { currentStreak: { gt: 0 } } }),
      this.prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT DATE(created_at) as date, COUNT(*)::int as count
        FROM users
        WHERE deleted_at IS NULL AND created_at >= ${thirtyDaysAgo}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
    ]);

    return {
      totalUsers,
      activatedUsers,
      premiumUsers,
      vipUsers,
      totalEarnings: Number(totalEarningsResult._sum.totalEarned ?? 0),
      totalWithdrawals: Number(totalWithdrawalsResult._sum.amount ?? 0),
      pendingWithdrawals,
      totalTasksCompleted,
      usersByDay: usersByDayRaw.map((row) => ({
        date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date),
        count: Number(row.count),
      })),
      activeStreaks,
    };
  }

  // ─── GET /admin/logs ──────────────────────────────────────────────────

  async getLogs(page = 1, limit = 50, action?: string) {
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (action) {
      where.action = action;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─── Actions utilisateur existantes ──────────────────────────────────

  async suspendUser(targetId: string, adminId: string) {
    if (targetId === adminId) {
      throw new BadRequestException('Impossible de vous suspendre vous-même');
    }

    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (user.role === 'ADMIN') {
      throw new BadRequestException('Impossible de suspendre un administrateur');
    }
    if (user.status === 'SUSPENDED') {
      throw new BadRequestException('Cet utilisateur est déjà suspendu');
    }

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: { status: 'SUSPENDED' },
      omit: { password: true },
    });

    await this.auditLog.log(adminId, 'SUSPEND_USER', 'User', targetId, {
      previousStatus: user.status,
    });

    return { message: 'Utilisateur suspendu avec succès', user: updated };
  }

  async banUser(targetId: string, adminId: string) {
    if (targetId === adminId) {
      throw new BadRequestException('Impossible de vous bannir vous-même');
    }

    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (user.role === 'ADMIN') {
      throw new BadRequestException('Impossible de bannir un administrateur');
    }
    if (user.status === 'BANNED') {
      throw new BadRequestException('Cet utilisateur est déjà banni');
    }

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: { status: 'BANNED' },
      omit: { password: true },
    });

    await this.auditLog.log(adminId, 'BAN_USER', 'User', targetId, {
      previousStatus: user.status,
    });

    return { message: 'Utilisateur banni avec succès', user: updated };
  }

  async activateUser(targetId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (user.status === 'ACTIVATED') {
      throw new BadRequestException('Cet utilisateur est déjà activé');
    }

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: { status: 'ACTIVATED' },
      omit: { password: true },
    });

    await this.auditLog.log(adminId, 'ACTIVATE_USER', 'User', targetId, {
      previousStatus: user.status,
      activationMethod: 'MANUAL',
    });

    return { message: 'Utilisateur activé avec succès', user: updated };
  }
}
