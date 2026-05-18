import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

/**
 * H2 FIX: Extended PrismaClient with soft-delete support
 * MAJEUR FIX #6: Transaction timeout protection against deadlocks
 *
 * IMPORTANT: To ensure soft-deleted users are filtered:
 * 1. Use prisma.user.findFirst/findMany with explicit { deletedAt: null } in where clause
 * 2. Or use the helper methods: findActiveUser(), findActiveUsers(), countActiveUsers()
 *
 * For admin queries that need to see deleted users, explicitly add:
 * { deletedAt: { not: null } } or omit the filter entirely if needed.
 */
@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, 'query' | 'info' | 'warn' | 'error'>
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ],
      // MAJEUR FIX #6: Configure transaction timeouts to prevent indefinite locks
      transactionOptions: {
        maxWait: 5000, // 5s max wait time for lock acquisition
        timeout: 10000, // 10s max transaction duration
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    });
  }

  async onModuleInit() {
    await this.$connect();

    // Note: Prisma middleware ($use) was removed in Prisma 5.
    // Soft-delete pattern is now implemented via helper methods below:
    // - findActiveUser()
    // - findActiveUsers()
    // - countActiveUsers()
    // - findActiveUserById()
    // - findActiveUserByEmail()
    //
    // For actual soft-delete (setting deletedAt), use service methods
    // that call prisma.user.update({ data: { deletedAt: new Date() } })
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
