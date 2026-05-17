import { Decimal } from '@prisma/client/runtime/library';

/**
 * Event déclenché après la complétion réussie d'une tâche.
 * Permet de découpler les side-effects (commissions, notifications, gamification)
 * de la transaction principale.
 */
export class TaskCompletedEvent {
  constructor(
    public readonly userId: string,
    public readonly taskId: string,
    public readonly completionId: string,
    public readonly reward: Decimal,
    public readonly taskType: string,
  ) {}
}
