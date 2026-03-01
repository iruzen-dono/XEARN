import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { wallet: true },
      omit: { password: true },
    });
  }

  async findAll(page = 1, limit = 20, search?: string, status?: string) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: { wallet: true },
        omit: { password: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, page, limit };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: true,
        referrals: {
          select: { id: true, firstName: true, lastName: true, createdAt: true, status: true },
        },
      },
      omit: { password: true },
    });
    return user;
  }

  async reactivateUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Utilisateur introuvable');
    if (user.status === 'ACTIVATED') throw new BadRequestException('Utilisateur déjà activé');
    return this.prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVATED' },
    });
  }

  async suspendUser(userId: string, requestingAdminId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Utilisateur introuvable');
    if (user.role === 'ADMIN') throw new BadRequestException('Impossible de suspendre un admin');
    if (userId === requestingAdminId) throw new BadRequestException('Impossible de vous suspendre vous-même');
    if (user.status === 'SUSPENDED') throw new BadRequestException('Utilisateur déjà suspendu');
    return this.prisma.user.update({
      where: { id: userId },
      data: { status: 'SUSPENDED' },
    });
  }

  async banUser(userId: string, requestingAdminId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Utilisateur introuvable');
    if (user.role === 'ADMIN') throw new BadRequestException('Impossible de bannir un admin');
    if (userId === requestingAdminId) throw new BadRequestException('Impossible de vous bannir vous-même');
    if (user.status === 'BANNED') throw new BadRequestException('Utilisateur déjà banni');
    return this.prisma.user.update({
      where: { id: userId },
      data: { status: 'BANNED' },
    });
  }

  async getStats() {
    const [totalUsers, activeUsers, totalActivated, suspendedUsers, bannedUsers] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'ACTIVATED' } }),
      this.prisma.user.count({ where: { status: { not: 'FREE' } } }),
      this.prisma.user.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.user.count({ where: { status: 'BANNED' } }),
    ]);

    return { totalUsers, activeUsers, totalActivated, suspendedUsers, bannedUsers };
  }

  async getAnalytics() {
    // Inscriptions des 30 derniers jours, groupées par jour
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const registrations = await this.prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE("createdAt") as date, COUNT(*) as count
      FROM users
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    // Top 10 parrains par nombre de filleuls
    const topReferrers = await this.prisma.user.findMany({
      where: {
        referrals: { some: {} },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        _count: { select: { referrals: true } },
      },
      orderBy: {
        referrals: { _count: 'desc' },
      },
      take: 10,
    });

    // Revenus des 30 derniers jours (activations)
    const revenue = await this.prisma.$queryRaw<{ date: string; total: any }[]>`
      SELECT DATE("createdAt") as date, SUM(amount) as total
      FROM transactions
      WHERE type = 'ACTIVATION' AND status = 'COMPLETED' AND "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    // Répartition des tâches par type
    const tasksByType = await this.prisma.task.groupBy({
      by: ['type'],
      _count: true,
    });

    // Top tâches les plus complétées
    const topTasks = await this.prisma.task.findMany({
      orderBy: { completionCount: 'desc' },
      take: 5,
      select: { id: true, title: true, type: true, completionCount: true, reward: true },
    });

    return {
      registrations: registrations.map((r) => ({ date: r.date, count: Number(r.count) })),
      topReferrers: topReferrers.map((r) => ({
        id: r.id,
        name: `${r.firstName} ${r.lastName}`,
        email: r.email,
        referrals: r._count.referrals,
      })),
      revenue: revenue.map((r) => ({ date: r.date, total: Number(r.total) })),
      tasksByType: tasksByType.map((t) => ({ type: t.type, count: (t._count as any)?._all ?? t._count })),
      topTasks,
    };
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; phone?: string }) {
    // Si un phone est fourni, vérifier qu'il n'est pas déjà pris
    if (data.phone) {
      const existing = await this.prisma.user.findUnique({ where: { phone: data.phone } });
      if (existing && existing.id !== userId) {
        throw new BadRequestException('Ce numéro de téléphone est déjà utilisé');
      }
    }

    const updateData: any = {};
    if (data.firstName !== undefined && data.firstName !== '') updateData.firstName = data.firstName;
    if (data.lastName !== undefined && data.lastName !== '') updateData.lastName = data.lastName;
    if (data.phone !== undefined) updateData.phone = data.phone || null;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { wallet: true },
      omit: { password: true },
    });

    return user;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Utilisateur introuvable');

    if (!user.password) {
      throw new BadRequestException('Votre compte utilise Google. Impossible de changer le mot de passe.');
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new BadRequestException('Mot de passe actuel incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Mot de passe modifié avec succès' };
  }
}
