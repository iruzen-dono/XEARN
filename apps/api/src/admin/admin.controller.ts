import { Controller, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { JwtRequest } from '../common/types';

@Controller('admin/users')
@ApiTags('Admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Patch(':id/suspend')
  async suspendUser(@Request() req: JwtRequest, @Param('id') id: string) {
    return this.adminService.suspendUser(id, req.user.id);
  }

  @Patch(':id/ban')
  async banUser(@Request() req: JwtRequest, @Param('id') id: string) {
    return this.adminService.banUser(id, req.user.id);
  }

  @Patch(':id/activate')
  async activateUser(@Request() req: JwtRequest, @Param('id') id: string) {
    return this.adminService.activateUser(id, req.user.id);
  }
}
