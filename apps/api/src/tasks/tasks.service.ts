import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReferralsService } from '../referrals/referrals.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private referralsService: ReferralsService,
  ) {}

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        skip,
        take: limit,
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.task.count({ where: { status: 'ACTIVE' } }),
    ]);
    return { tasks, total, page, limit };
  }

  async findAllAdmin(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.task.count(),
    ]);
    return { tasks, total, page, limit };
  }

  async create(data: {
    title: string;
    description?: string;
    type: 'VIDEO_AD' | 'CLICK_AD' | 'SURVEY' | 'SPONSORED';
    reward: number;
    mediaUrl?: string;
    externalUrl?: string;
    maxCompletions?: number;
  }) {
    return this.prisma.task.create({ data });
  }

  async completeTask(userId: string, taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Tâche introuvable');
    if (task.status !== 'ACTIVE') throw new BadRequestException('Tâche non disponible');

    // Vérifier que l'utilisateur est activé
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== 'ACTIVATED') {
      throw new BadRequestException('Compte non activé — activez votre compte pour gagner des récompenses');
    }

    // Vérifier si déjà complétée
    const existing = await this.prisma.taskCompletion.findUnique({
      where: { userId_taskId: { userId, taskId } },
    });
    if (existing) throw new BadRequestException('Tâche déjà complétée');

    // Vérifier max completions
    if (task.maxCompletions && task.completionCount >= task.maxCompletions) {
      throw new BadRequestException('Nombre maximum de complétions atteint');
    }

    // Transaction atomique : compléter la tâche + créditer le wallet
    const result = await this.prisma.$transaction(async (tx) => {
      // Créer la complétion
      const completion = await tx.taskCompletion.create({
        data: { userId, taskId, earned: task.reward },
      });

      // Incrémenter le compteur de la tâche
      await tx.task.update({
        where: { id: taskId },
        data: { completionCount: { increment: 1 } },
      });

      // Créditer le wallet
      await tx.wallet.update({
        where: { userId },
        data: {
          balance: { increment: task.reward },
          totalEarned: { increment: task.reward },
        },
      });

      // Créer la transaction
      await tx.transaction.create({
        data: {
          userId,
          type: 'TASK_EARNING',
          status: 'COMPLETED',
          amount: task.reward,
          description: `Gain tâche: ${task.title}`,
        },
      });

      return completion;
    });

    // Distribuer les commissions de parrainage (hors transaction pour ne pas bloquer)
    try {
      await this.referralsService.distributeCommissions(
        userId,
        new Decimal(task.reward.toString()),
      );
    } catch (err) {
      console.error('Erreur distribution commissions parrainage:', err);
    }

    return result;
  }

  async getUserCompletions(userId: string) {
    return this.prisma.taskCompletion.findMany({
      where: { userId },
      include: { task: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggleTask(taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Tâche introuvable');
    const newStatus = task.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    return this.prisma.task.update({
      where: { id: taskId },
      data: { status: newStatus },
    });
  }

  async deleteTask(taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Tâche introuvable');
    return this.prisma.task.delete({ where: { id: taskId } });
  }
}
