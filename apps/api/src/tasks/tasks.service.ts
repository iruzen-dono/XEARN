import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReferralsService } from '../referrals/referrals.service';
import { NotificationsService } from '../notifications/notifications.service';
import { GamificationService } from '../gamification/gamification.service';
import { Decimal } from '@prisma/client/runtime/library';

// Durée minimum en secondes par type de tâche
const MIN_DURATION_SECONDS: Record<string, number> = {
  VIDEO_AD: 15,
  CLICK_AD: 10,
  SURVEY: 30,
  SPONSORED: 15,
};

// Cooldown entre deux tâches (en secondes)
const TASK_COOLDOWN_SECONDS = 10;

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private referralsService: ReferralsService,
    private notificationsService: NotificationsService,
    private gamificationService: GamificationService,
  ) {}

  private readonly TIER_ORDER = ['NORMAL', 'PREMIUM', 'VIP'] as const;

  private tierSatisfied(userTier: string, requiredTier: string): boolean {
    return this.TIER_ORDER.indexOf(userTier as any) >= this.TIER_ORDER.indexOf(requiredTier as any);
  }

  async findAll(userId: string, page = 1, limit = 20) {
    // Fetch user tier to filter visible tasks
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });
    const userTier = user?.tier || 'NORMAL';
    const accessibleTiers = this.TIER_ORDER.slice(0, this.TIER_ORDER.indexOf(userTier as any) + 1);

    const skip = (page - 1) * limit;
    const where = { status: 'ACTIVE' as const, requiredTier: { in: accessibleTiers as any } };
    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.task.count({ where }),
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
    requiredTier?: 'NORMAL' | 'PREMIUM' | 'VIP';
  }) {
    return this.prisma.task.create({ data });
  }

  async completeTask(userId: string, taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Tâche introuvable');
    if (task.status !== 'ACTIVE') throw new BadRequestException('Tâche non disponible');

    // H4 fix: Reject expired tasks
    if (task.expiresAt && new Date(task.expiresAt) < new Date()) {
      throw new BadRequestException('Cette tâche a expiré');
    }

    // Vérifier que l'utilisateur est activé
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== 'ACTIVATED') {
      throw new BadRequestException(
        'Compte non activé — activez votre compte pour gagner des récompenses',
      );
    }

    // Vérifier le tier requis
    if (!this.tierSatisfied(user.tier, task.requiredTier)) {
      throw new BadRequestException(`Cette tâche nécessite le niveau ${task.requiredTier}`);
    }

    // Vérifier si déjà complétée (preliminary check — authoritative check inside $transaction)
    const existing = await this.prisma.taskCompletion.findUnique({
      where: { userId_taskId: { userId, taskId } },
    });
    if (existing) throw new BadRequestException('Tâche déjà complétée');

    // Vérifier que la tâche a été démarrée (anti-triche)
    const session = await this.prisma.taskSession.findUnique({
      where: { userId_taskId: { userId, taskId } },
    });
    if (!session) {
      throw new BadRequestException("Vous devez d'abord démarrer la tâche");
    }
    if (session.completed) {
      throw new BadRequestException('Session déjà utilisée');
    }

    // Vérifier le temps minimum selon le type de tâche
    const minSeconds = MIN_DURATION_SECONDS[task.type] || 10;
    const elapsedMs = Date.now() - session.startedAt.getTime();
    const elapsedSeconds = elapsedMs / 1000;

    if (elapsedSeconds < minSeconds) {
      const remaining = Math.ceil(minSeconds - elapsedSeconds);
      throw new BadRequestException(
        `Temps insuffisant. Veuillez patienter encore ${remaining} seconde(s) avant de compléter cette tâche.`,
      );
    }

    // Cooldown : vérifier la dernière complétion de l'utilisateur
    const lastCompletion = await this.prisma.taskCompletion.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (lastCompletion) {
      const cooldownMs = TASK_COOLDOWN_SECONDS * 1000;
      const timeSinceLast = Date.now() - lastCompletion.createdAt.getTime();
      if (timeSinceLast < cooldownMs) {
        const waitSeconds = Math.ceil((cooldownMs - timeSinceLast) / 1000);
        throw new BadRequestException(
          `Veuillez patienter ${waitSeconds} seconde(s) avant de compléter une autre tâche.`,
        );
      }
    }

    // Preliminary max completions check (authoritative re-check inside $transaction)
    if (task.maxCompletions && task.completionCount >= task.maxCompletions) {
      throw new BadRequestException('Nombre maximum de complétions atteint');
    }

    // Transaction atomique : compléter la tâche + créditer le wallet
    let result;
    try {
      result = await this.prisma.$transaction(async (tx) => {
        // Re-check maxCompletions inside transaction (authoritative)
        const freshTask = await tx.task.findUniqueOrThrow({ where: { id: taskId } });
        if (freshTask.maxCompletions && freshTask.completionCount >= freshTask.maxCompletions) {
          throw new BadRequestException('Nombre maximum de complétions atteint');
        }

        // Marquer la session comme utilisée
        await tx.taskSession.update({
          where: { userId_taskId: { userId, taskId } },
          data: { completed: true },
        });

        // Créer la complétion (unique constraint handles concurrent duplicates)
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
    } catch (error: unknown) {
      // Handle Prisma unique constraint violation (P2002) — concurrent duplicate completion
      if (error instanceof Error && 'code' in error && (error as any).code === 'P2002') {
        throw new BadRequestException('Tâche déjà complétée');
      }
      throw error;
    }

    // Distribuer les commissions de parrainage (hors transaction pour ne pas bloquer)
    try {
      await this.referralsService.distributeCommissions(
        userId,
        new Decimal(task.reward.toString()),
      );
    } catch (err) {
      console.error('Erreur distribution commissions parrainage:', err);
    }

    // Notification de tâche complétée
    try {
      await this.notificationsService.notifyTaskCompleted(userId, task.title, Number(task.reward));
    } catch (err) {
      console.error('Erreur notification:', err);
    }

    // Gamification: streak + badges
    try {
      await this.gamificationService.recordActivity(userId);
      await this.gamificationService.checkTaskBadges(userId);
      await this.gamificationService.checkEarningsBadges(userId);
    } catch (err) {
      console.error('Erreur gamification:', err);
    }

    return result;
  }

  async startTask(userId: string, taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Tâche introuvable');
    if (task.status !== 'ACTIVE') throw new BadRequestException('Tâche non disponible');

    // Vérifier que l'utilisateur est activé
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== 'ACTIVATED') {
      throw new BadRequestException(
        'Compte non activé — activez votre compte pour gagner des récompenses',
      );
    }

    // Vérifier le tier requis
    if (!this.tierSatisfied(user.tier, task.requiredTier)) {
      throw new BadRequestException(`Cette tâche nécessite le niveau ${task.requiredTier}`);
    }

    // Vérifier si déjà complétée
    const existing = await this.prisma.taskCompletion.findUnique({
      where: { userId_taskId: { userId, taskId } },
    });
    if (existing) throw new BadRequestException('Tâche déjà complétée');

    // Créer ou reset la session (upsert pour supporter le retry)
    const session = await this.prisma.taskSession.upsert({
      where: { userId_taskId: { userId, taskId } },
      update: { startedAt: new Date(), completed: false },
      create: { userId, taskId },
    });

    const minSeconds = MIN_DURATION_SECONDS[task.type] || 10;

    return {
      sessionId: session.id,
      startedAt: session.startedAt,
      minDurationSeconds: minSeconds,
      task: {
        id: task.id,
        title: task.title,
        type: task.type,
        description: task.description,
        mediaUrl: task.mediaUrl,
        externalUrl: task.externalUrl,
        reward: task.reward,
      },
    };
  }

  // M5 fix: Paginate user completions
  async getUserCompletions(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [completions, total] = await Promise.all([
      this.prisma.taskCompletion.findMany({
        where: { userId },
        include: { task: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.taskCompletion.count({ where: { userId } }),
    ]);
    return { completions, total, page, limit };
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

  async updateTask(
    taskId: string,
    data: {
      title?: string;
      description?: string;
      type?: 'VIDEO_AD' | 'CLICK_AD' | 'SURVEY' | 'SPONSORED';
      reward?: number;
      mediaUrl?: string;
      externalUrl?: string;
      maxCompletions?: number;
      requiredTier?: 'NORMAL' | 'PREMIUM' | 'VIP';
    },
  ) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Tâche introuvable');
    return this.prisma.task.update({ where: { id: taskId }, data });
  }

  async deleteTask(taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Tâche introuvable');
    // Soft-delete: archive the task instead of destroying it (preserves history)
    return this.prisma.task.update({
      where: { id: taskId },
      data: { status: 'EXPIRED' },
    });
  }
}
