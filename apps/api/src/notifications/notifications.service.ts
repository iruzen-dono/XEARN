import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, unknown>,
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        metadata: metadata as import('@prisma/client').Prisma.InputJsonValue | undefined,
      },
    });

    // Emit SSE event for real-time push
    this.eventEmitter.emit(`notification.${userId}`, notification);

    return notification;
  }

  async getForUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, read: false } }),
    ]);

    return { notifications, total, unreadCount, page, limit };
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }

  async markAsRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  // ---- Convenience methods for auto-creating notifications ----

  async notifyWelcome(userId: string) {
    return this.create(
      userId,
      'WELCOME',
      'Bienvenue sur XEARN !',
      "Votre compte a été créé avec succès. Commencez par compléter des tâches pour gagner de l'argent !",
    );
  }

  async notifyTaskCompleted(userId: string, taskTitle: string, reward: number) {
    return this.create(
      userId,
      'TASK_COMPLETED',
      'Tâche complétée !',
      `Vous avez gagné ${reward.toLocaleString('fr-FR')} FCFA pour la tâche "${taskTitle}".`,
    );
  }

  async notifyCommission(userId: string, amount: number, level: number, sourceName: string) {
    return this.create(
      userId,
      'COMMISSION_RECEIVED',
      `Commission N${level} reçue`,
      `Vous avez reçu ${amount.toLocaleString('fr-FR')} FCFA de commission grâce à ${sourceName}.`,
    );
  }

  async notifyWithdrawalApproved(userId: string, amount: number) {
    return this.create(
      userId,
      'WITHDRAWAL_APPROVED',
      'Retrait approuvé',
      `Votre retrait de ${amount.toLocaleString('fr-FR')} FCFA a été approuvé et envoyé.`,
    );
  }

  async notifyWithdrawalRejected(userId: string, amount: number) {
    return this.create(
      userId,
      'WITHDRAWAL_REJECTED',
      'Retrait refusé',
      `Votre demande de retrait de ${amount.toLocaleString('fr-FR')} FCFA a été refusée. Contactez le support si nécessaire.`,
    );
  }

  async notifyAccountActivated(userId: string) {
    return this.create(
      userId,
      'ACCOUNT_ACTIVATED',
      'Compte activé !',
      'Votre compte est maintenant activé. Vous pouvez effectuer des retraits et profiter du parrainage.',
    );
  }

  async notifyNewReferral(userId: string, referralName: string) {
    return this.create(
      userId,
      'NEW_REFERRAL',
      'Nouveau filleul !',
      `${referralName} s'est inscrit grâce à votre lien de parrainage.`,
    );
  }
}
