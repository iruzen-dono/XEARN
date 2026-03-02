import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { ReferralsModule } from '../referrals/referrals.module';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [ReferralsModule, GamificationModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
