import { Module } from '@nestjs/common';
import { AdsService } from './ads.service';
import { AdsController } from './ads.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogService } from '../common/audit-log.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdsController],
  providers: [AdsService, AuditLogService],
  exports: [AdsService],
})
export class AdsModule {}
