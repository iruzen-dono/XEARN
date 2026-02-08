import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { wallet: true },
    });
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        include: { wallet: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
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
    });
    return user;
  }

  async activateAccount(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVATED' },
    });
  }

  async suspendUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status: 'SUSPENDED' },
    });
  }

  async banUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status: 'BANNED' },
    });
  }

  async getStats() {
    const [totalUsers, activeUsers, totalActivated] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'ACTIVATED' } }),
      this.prisma.user.count({ where: { status: { not: 'FREE' } } }),
    ]);

    return { totalUsers, activeUsers, totalActivated };
  }
}
