import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Find a user excluding soft-deleted records.
   * Use standard prisma.user.findFirst/findMany with explicit deletedAt filter
   * when you need to include deleted users (admin queries).
   */
  async findActiveUser(where: Prisma.UserWhereInput) {
    return this.user.findFirst({
      where: { ...where, deletedAt: null },
    });
  }

  async findActiveUsers(args: Prisma.UserFindManyArgs) {
    return this.user.findMany({
      ...args,
      where: { ...args.where, deletedAt: null },
    });
  }

  async countActiveUsers(where: Prisma.UserWhereInput = {}) {
    return this.user.count({
      where: { ...where, deletedAt: null },
    });
  }
}
