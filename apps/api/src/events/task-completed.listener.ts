import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TaskCompletedEvent } from './task-completed.event';
import { ReferralsService } from '../referrals/referrals.service';
import { NotificationsService } from '../notifications/notifications.service';
import { GamificationService } from '../gamification/gamification.service';

/**
 * Listener pour l'événement TaskCompleted.
 * Gère tous les side-effects post-complétion de manière asynchrone et résiliente.
 */
@Injectable()
export class TaskCompletedListener {
  private readonly logger = new Logger(TaskCompletedListener.name);

  constructor(
    private referralsService: ReferralsService,
    private notificationsService: NotificationsService,
    private gamificationService: GamificationService,
  ) {}

  @OnEvent('task.completed', { async: true })
  async handleTaskCompleted(event: TaskCompletedEvent) {
    const { userId, completionId, reward, taskType } = event;

    this.logger.log(`Processing TaskCompleted event: user=${userId}, completion=${completionId}`);

    // 1. Distribute referral commissions
    try {
      await this.referralsService.distributeCommissions(userId, reward, completionId);
    } catch (error) {
      this.logger.error(
        `Failed to distribute commissions for completion ${completionId}:`,
        error instanceof Error ? error.stack : String(error),
      );
      // Non-blocking: continue with other side-effects
    }

    // 2. Send user notification
    try {
      await this.notificationsService.notifyTaskCompleted(
        userId,
        `Tâche ${taskType}`,
        Number(reward),
      );
    } catch (error) {
      this.logger.warn(
        `Failed to send notification for completion ${completionId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Non-critical: SSE failure shouldn't block
    }

    // 3. Award badges and gamification
    try {
      await this.gamificationService.checkTaskBadges(userId);
      await this.gamificationService.recordActivity(userId);
      await this.gamificationService.checkEarningsBadges(userId);
    } catch (error) {
      this.logger.warn(
        `Failed to award badges for completion ${completionId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Non-critical: badge awards shouldn't block
    }

    this.logger.log(`TaskCompleted event processed successfully: ${completionId}`);
  }

  /**
   * Fallback handler pour les erreurs non catchées dans le listener.
   * Empêche les erreurs d'un listener de crasher l'application.
   */
  @OnEvent('task.completed.error')
  handleTaskCompletedError(error: Error) {
    this.logger.error('Unhandled error in TaskCompleted listener:', error.stack);
  }
}
