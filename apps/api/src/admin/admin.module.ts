import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuditLogService } from '../common/audit-log.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, AuditLogService],
  exports: [AdminService],
})
export class AdminModule {}
