import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../../src/prisma/prisma.service';
import { NotificationsService } from '../../src/notifications/notifications.service';
import { GamificationService } from '../../src/gamification/gamification.service';

/**
 * Configuration commune pour tous les tests d'intégration.
 * Inclut tous les modules et providers nécessaires.
 */
export const getIntegrationTestModules = () => ({
  imports: [ConfigModule.forRoot(), EventEmitterModule.forRoot()],
  baseProviders: [PrismaService, NotificationsService, GamificationService],
});
