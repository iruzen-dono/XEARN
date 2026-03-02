import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuditLogService } from '../common/audit-log.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, AuditLogService],
  exports: [UsersService, AuditLogService],
})
export class UsersModule {}
