import { Injectable } from '@nestjs/common';
import { InputJsonValue } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async log(
    adminId: string,
    action: string,
    targetType: string,
    targetId: string,
    details?: InputJsonValue,
  ) {
    return this.prisma.auditLog.create({
      data: { adminId, action, targetType, targetId, details: details ?? undefined },
    });
  }

  async findAll(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count(),
    ]);
    return { logs, total, page, pages: Math.ceil(total / limit) };
  }
}
