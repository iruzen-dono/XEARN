import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

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
