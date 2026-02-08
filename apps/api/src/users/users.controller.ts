import { Controller, Get, Param, Query, UseGuards, Request, Patch } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req: any) {
    return this.usersService.getProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get()
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.usersService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
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
  @Patch(':id/suspend')
  async suspendUser(@Param('id') id: string) {
    return this.usersService.suspendUser(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/ban')
  async banUser(@Param('id') id: string) {
    return this.usersService.banUser(id);
  }
}
