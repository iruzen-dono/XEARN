import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

/**
 * H2 FIX: Extended PrismaClient with soft-delete support
 *
 * IMPORTANT: To ensure soft-deleted users are filtered:
 * 1. Use prisma.user.findFirst/findMany with explicit { deletedAt: null } in where clause
 * 2. Or use the helper methods: findActiveUser(), findActiveUsers(), countActiveUsers()
 *
 * For admin queries that need to see deleted users, explicitly add:
 * { deletedAt: { not: null } } or omit the filter entirely if needed.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();

    // Middleware: automatically filter soft-deleted users in findMany/findFirst/findUnique queries
    this.$use(async (params, next) => {
      // Only apply to User model queries
      if (params.model === 'User') {
        // For read operations, automatically exclude soft-deleted records
        if (params.action === 'findUnique' || params.action === 'findFirst') {
          // Convert findUnique to findFirst if deletedAt filter is needed
          if (params.action === 'findUnique') {
            params.action = 'findFirst';
          }
          params.args.where = {
            ...params.args.where,
            deletedAt: null,
          };
        }

        if (params.action === 'findMany') {
          if (!params.args) {
            params.args = {};
          }
          if (!params.args.where) {
            params.args.where = {};
          }
          // Only add deletedAt filter if not explicitly overridden
          if (!params.args.where.deletedAt) {
            params.args.where.deletedAt = null;
          }
        }

        // Convert delete/deleteMany to soft delete (update deletedAt)
        if (params.action === 'delete') {
          params.action = 'update';
          params.args.data = { deletedAt: new Date() };
        }

        if (params.action === 'deleteMany') {
          params.action = 'updateMany';
          if (!params.args.data) {
            params.args.data = {};
          }
          params.args.data.deletedAt = new Date();
        }
      }

      return next(params);
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Find a single active (non-deleted) user.
   * Automatically filters out soft-deleted records.
   */
  async findActiveUser(where: Prisma.UserWhereInput) {
    return this.user.findFirst({
      where: { ...where, deletedAt: null },
    });
  }

  /**
   * Find multiple active (non-deleted) users.
   * Automatically filters out soft-deleted records.
   */
  async findActiveUsers(args: Prisma.UserFindManyArgs = {}) {
    return this.user.findMany({
      ...args,
      where: { ...args.where, deletedAt: null },
    });
  }

  /**
   * Count active (non-deleted) users.
   * Automatically filters out soft-deleted records.
   */
  async countActiveUsers(where: Prisma.UserWhereInput = {}) {
    return this.user.count({
      where: { ...where, deletedAt: null },
    });
  }

  /**
   * Find a unique active user by ID.
   * Automatically filters out soft-deleted records.
   */
  async findActiveUserById(id: string) {
    return this.user.findFirst({
      where: { id, deletedAt: null },
    });
  }

  /**
   * Find a unique active user by email.
   * Automatically filters out soft-deleted records.
   */
  async findActiveUserByEmail(email: string) {
    return this.user.findFirst({
      where: { email, deletedAt: null },
    });
  }
}
