import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReferralsService } from '../referrals/referrals.service';
import { NotificationsService } from '../notifications/notifications.service';
import { GamificationService } from '../gamification/gamification.service';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
import type { AccountTier, TaskStatus, TaskType } from '@xearn/types';

// Durée minimum en secondes par type de tâche
const MIN_DURATION_SECONDS: Record<TaskType, number> = {
  VIDEO_AD: 15,
  CLICK_AD: 10,
  SURVEY: 30,
  SPONSORED: 15,
  EXTERNAL: 10, // Tâches externes (inscriptions, etc.)
};

// Cooldown entre deux tâches (en secondes)
const TASK_COOLDOWN_SECONDS = 10;

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private prisma: PrismaService,
    private referralsService: ReferralsService,
    private notificationsService: NotificationsService,
    private gamificationService: GamificationService,
  ) {}

  private readonly TIER_ORDER: readonly AccountTier[] = ['NORMAL', 'PREMIUM', 'VIP'];

  private tierSatisfied(userTier: AccountTier, requiredTier: AccountTier): boolean {
    return this.TIER_ORDER.indexOf(userTier) >= this.TIER_ORDER.indexOf(requiredTier);
  }

  /**
   * Generate a unique verification code in format XE-XXXX
   * Example: XE-2847, XE-1093
   */
  private generateVerificationCode(): string {
    const randomNum = Math.floor(1000 + Math.random() * 9000); // 1000-9999
    return `XE-${randomNum}`;
  }

  async findAll(userId: string, page = 1, limit = 20) {
    // Fetch user tier to filter visible tasks
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });
    const userTier: AccountTier = user?.tier || 'NORMAL';
    const accessibleTiers = this.TIER_ORDER.slice(0, this.TIER_ORDER.indexOf(userTier) + 1);

    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {
      AND: [{ status: 'ACTIVE' }, { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }],
      requiredTier: { in: accessibleTiers },
    };
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
    type: TaskType;
    reward: number;
    mediaUrl?: string;
    externalUrl?: string;
    maxCompletions?: number;
    requiredTier?: AccountTier;
  }) {
    return this.prisma.task.create({ data });
  }

  /**
   * Get task landing page data (for /go/:slug route)
   * Returns task details + verification code from active session
   */
  async getTaskLandingPage(slug: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { slug },
    });

    if (!task) {
      throw new NotFoundException('Tâche introuvable');
    }

    // Check if user has an active session with verification code
    const session = await this.prisma.taskSession.findUnique({
      where: { userId_taskId: { userId, taskId: task.id } },
    });

    if (!session || !session.verificationCode) {
      throw new BadRequestException(
        'Aucune session active. Veuillez démarrer la tâche depuis la page des tâches.',
      );
    }

    // Mark that user has viewed the code
    if (!session.codeViewedAt) {
      await this.prisma.taskSession.update({
        where: { id: session.id },
        data: { codeViewedAt: new Date() },
      });
    }

    return {
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        instructions: task.instructions,
        reward: Number(task.reward),
        externalUrl: task.referralLink || task.externalUrl,
        requiresCode: task.requiresCode,
      },
      session: {
        verificationCode: session.verificationCode,
        startedAt: session.startedAt,
        codeGeneratedAt: session.codeGeneratedAt,
      },
    };
  }

  async completeTask(userId: string, taskId: string, verificationCode?: string) {
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

    // ANTI-FRAUD: Validate verification code if required
    if (task.requiresCode) {
      if (!verificationCode) {
        throw new BadRequestException('Code de vérification requis pour cette tâche');
      }

      if (!session.verificationCode) {
        throw new BadRequestException('Aucun code de vérification généré pour cette session');
      }

      if (verificationCode.toUpperCase() !== session.verificationCode.toUpperCase()) {
        this.logger.warn(
          `Tentative de fraude détectée: userId=${userId}, taskId=${taskId}, code fourni=${verificationCode}, code attendu=${session.verificationCode}`,
        );
        throw new BadRequestException('Code de vérification incorrect');
      }

      // Verify user has viewed the landing page
      if (!session.codeViewedAt) {
        throw new BadRequestException(
          'Vous devez voir le code sur la page intermédiaire avant de valider',
        );
      }

      // Ensure minimum time has passed since code was viewed (10 seconds)
      const timeSinceViewed = Date.now() - session.codeViewedAt.getTime();
      if (timeSinceViewed < 10000) {
        const remaining = Math.ceil((10000 - timeSinceViewed) / 1000);
        throw new BadRequestException(
          `Veuillez attendre encore ${remaining} seconde(s) après avoir vu le code`,
        );
      }
    }

    // Vérifier le temps minimum selon le type de tâche
    const taskType = task.type as TaskType;
    const minSeconds = MIN_DURATION_SECONDS[taskType] || 10;
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
      result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Lock the task row to serialize concurrent completions
        const rows = await tx.$queryRaw<
          { maxCompletions: number | null; completionCount: number }[]
        >`
          SELECT "maxCompletions", "completionCount" FROM tasks WHERE id = ${taskId} FOR UPDATE
        `;
        if (!rows[0]) throw new NotFoundException('Tâche introuvable');
        if (rows[0].maxCompletions && rows[0].completionCount >= rows[0].maxCompletions) {
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
      if (this.isUniqueConstraintError(error)) {
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
      this.logger.error('Erreur distribution commissions parrainage', err);
    }

    // Notification de tâche complétée
    try {
      await this.notificationsService.notifyTaskCompleted(userId, task.title, Number(task.reward));
    } catch (err) {
      this.logger.error('Erreur notification', err);
    }

    // Gamification: streak + badges
    try {
      await this.gamificationService.recordActivity(userId);
      await this.gamificationService.checkTaskBadges(userId);
      await this.gamificationService.checkEarningsBadges(userId);
    } catch (err) {
      this.logger.error('Erreur gamification', err);
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

    // Generate verification code if task requires it
    const verificationCode = task.requiresCode ? this.generateVerificationCode() : null;
    const now = new Date();

    // Créer ou reset la session (upsert pour supporter le retry)
    const session = await this.prisma.taskSession.upsert({
      where: { userId_taskId: { userId, taskId } },
      update: {
        startedAt: now,
        completed: false,
        verificationCode,
        codeGeneratedAt: verificationCode ? now : null,
        codeViewedAt: null, // Reset when restarting
      },
      create: {
        userId,
        taskId,
        verificationCode,
        codeGeneratedAt: verificationCode ? now : null,
      },
    });

    const taskType = task.type as TaskType;
    const minSeconds = MIN_DURATION_SECONDS[taskType] || 10;

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
    const newStatus: TaskStatus = task.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
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
      type?: TaskType;
      reward?: number;
      mediaUrl?: string;
      externalUrl?: string;
      maxCompletions?: number;
      requiredTier?: AccountTier;
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

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 'P2002'
    );
  }
}
