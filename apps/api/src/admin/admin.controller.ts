import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  Request,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CacheTTL, CacheInterceptor } from '@nestjs/cache-manager';
import { AdminService } from './admin.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { JwtRequest } from '../common/types';
import { CuidValidationPipe } from '../common/pipes/cuid-validation.pipe';

@Controller('admin')
@ApiTags('Admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private adminService: AdminService) {}

  // GET /admin/users — liste paginée
  @Get('users')
  async getUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('tier') tier?: string,
  ) {
    return this.adminService.getUsers(page ?? 1, limit ?? 20, search, status, tier);
  }

  // GET /admin/stats — dashboard stats (cache 60s)
  @Get('stats')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60)
  async getStats() {
    return this.adminService.getStats();
  }

  // GET /admin/logs — audit logs paginés
  @Get('logs')
  async getLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('action') action?: string,
  ) {
    return this.adminService.getLogs(page ?? 1, limit ?? 50, action);
  }

  // PATCH /admin/users/:id/suspend
  @Patch('users/:id/suspend')
  async suspendUser(@Request() req: JwtRequest, @Param('id', CuidValidationPipe) id: string) {
    return this.adminService.suspendUser(id, req.user.id);
  }

  // PATCH /admin/users/:id/ban
  @Patch('users/:id/ban')
  async banUser(@Request() req: JwtRequest, @Param('id', CuidValidationPipe) id: string) {
    return this.adminService.banUser(id, req.user.id);
  }

  // PATCH /admin/users/:id/activate
  @Patch('users/:id/activate')
  async activateUser(@Request() req: JwtRequest, @Param('id', CuidValidationPipe) id: string) {
    return this.adminService.activateUser(id, req.user.id);
  }
}
