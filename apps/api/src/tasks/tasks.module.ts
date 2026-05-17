import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { ReferralsModule } from '../referrals/referrals.module';
import { GamificationModule } from '../gamification/gamification.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TaskCompletedListener } from '../events/task-completed.listener';

@Module({
  imports: [ReferralsModule, GamificationModule, NotificationsModule],
  controllers: [TasksController],
  providers: [TasksService, TaskCompletedListener],
  exports: [TasksService],
})
export class TasksModule {}
