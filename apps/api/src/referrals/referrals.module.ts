import { Module } from '@nestjs/common';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [GamificationModule],
  controllers: [ReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
