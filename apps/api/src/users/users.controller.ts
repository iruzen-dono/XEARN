import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  Patch,
  Body,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { UsersService } from './users.service';
import { AuditLogService } from '../common/audit-log.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { UpdateProfileDto, ChangePasswordDto } from './dto/update-profile.dto';
import { JwtRequest } from '../common/types';

@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private auditLog: AuditLogService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req: JwtRequest) {
    return this.usersService.getProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateProfile(@Request() req: JwtRequest, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/password')
  async changePassword(@Request() req: JwtRequest, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.usersService.findAll(
      Math.max(1, parseInt(page || '') || 1),
      Math.min(Math.max(1, parseInt(limit || '') || 20), 100),
      search,
      status,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('stats')
  async getStats() {
    return this.usersService.getStats();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('analytics')
  async getAnalytics() {
    return this.usersService.getAnalytics();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('export/csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportUsersCsv(@Res() res: Response) {
    const { users } = await this.usersService.findAll(1, 10000);
    const header = 'id,firstName,lastName,email,phone,status,tier,role,referralCode,createdAt\n';
    const rows = users
      .map((u) =>
        [
          u.id,
          this.csvSafe(u.firstName),
          this.csvSafe(u.lastName),
          this.csvSafe(u.email || ''),
          this.csvSafe(u.phone || ''),
          u.status,
          u.tier,
          u.role,
          u.referralCode,
          u.createdAt,
        ].join(','),
      )
      .join('\n');
    res.setHeader('Content-Disposition', 'attachment; filename=xearn-users.csv');
    res.send(header + rows);
  }

  /** Escape CSV values to prevent formula injection (=, +, -, @, \t, \r) */
  private csvSafe(value: string): string {
    if (/^[=+\-@\t\r]/.test(value)) {
      return `"'${value.replace(/"/g, '""')}"`;
    }
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/activate')
  async reactivateUser(@Request() req: JwtRequest, @Param('id') id: string) {
    const result = await this.usersService.reactivateUser(id);
    await this.auditLog.log(req.user.id, 'REACTIVATE_USER', 'User', id);
    return result;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/suspend')
  async suspendUser(@Request() req: JwtRequest, @Param('id') id: string) {
    const result = await this.usersService.suspendUser(id, req.user.id);
    await this.auditLog.log(req.user.id, 'SUSPEND_USER', 'User', id);
    return result;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/ban')
  async banUser(@Request() req: JwtRequest, @Param('id') id: string) {
    const result = await this.usersService.banUser(id, req.user.id);
    await this.auditLog.log(req.user.id, 'BAN_USER', 'User', id);
    return result;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('audit-logs')
  async getAuditLogs(@Query('page') page?: string) {
    return this.auditLog.findAll(Math.max(1, parseInt(page || '') || 1));
  }
}
