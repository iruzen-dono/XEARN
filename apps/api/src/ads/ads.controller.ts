import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AdsService } from './ads.service';
import { CreateAdDto, UpdateAdDto } from './dto/ads.dto';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { AuditLogService } from '../common/audit-log.service';
import { JwtRequest } from '../common/types';

@Controller('ads')
export class AdsController {
  constructor(
    private ads: AdsService,
    private auditLog: AuditLogService,
  ) {}

  // ─── Public ─────────────────────────────────────────
  /** List active advertisements (filtered by user tier if authenticated) */
  @Get()
  @UseGuards(JwtAuthGuard)
  async findActive(@Req() req: JwtRequest, @Query('page') page?: string) {
    const userTier = req.user?.tier || 'NORMAL';
    const userCountry = req.user?.country;
    return this.ads.findActive(parseInt(page || '1', 10) || 1, 20, userTier, userCountry);
  }

  // ─── Authenticated publisher routes ─────────────────
  /** Create a new ad (PARTNER or ADMIN only) */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PARTNER', 'ADMIN')
  create(@Req() req: JwtRequest, @Body() dto: CreateAdDto) {
    return this.ads.create(req.user.id, dto);
  }

  /** List my own ads */
  @Get('mine')
  @UseGuards(JwtAuthGuard)
  findMine(@Req() req: JwtRequest, @Query('page') page?: string) {
    return this.ads.findByPublisher(req.user.id, parseInt(page || '1', 10) || 1);
  }

  /** Get my ad stats (publisher dashboard) */
  @Get('mine/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PARTNER', 'ADMIN')
  getMyStats(@Req() req: JwtRequest) {
    return this.ads.getPublisherStats(req.user.id);
  }

  /** Update my ad */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Req() req: JwtRequest, @Param('id') id: string, @Body() dto: UpdateAdDto) {
    const isAdmin = req.user.role === 'ADMIN';
    return this.ads.update(id, req.user.id, isAdmin, dto);
  }

  /** Delete my ad */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Req() req: JwtRequest, @Param('id') id: string) {
    const isAdmin = req.user.role === 'ADMIN';
    return this.ads.remove(id, req.user.id, isAdmin);
  }

  // ─── Admin routes ───────────────────────────────────
  /** Admin: list all ads */
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  adminFindAll(@Query('page') page?: string, @Query('status') status?: string) {
    return this.ads.adminFindAll(parseInt(page || '1', 10) || 1, status);
  }

  /** Admin: approve ad */
  @Patch('admin/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async approve(@Req() req: JwtRequest, @Param('id') id: string) {
    const result = await this.ads.approve(id);
    await this.auditLog.log(req.user.id, 'APPROVE_AD', 'Advertisement', id);
    return result;
  }

  /** Admin: reject ad */
  @Patch('admin/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async reject(@Req() req: JwtRequest, @Param('id') id: string) {
    const result = await this.ads.reject(id);
    await this.auditLog.log(req.user.id, 'REJECT_AD', 'Advertisement', id);
    return result;
  }

  /** Admin: pause ad */
  @Patch('admin/:id/pause')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async pause(@Req() req: JwtRequest, @Param('id') id: string) {
    const result = await this.ads.pause(id);
    await this.auditLog.log(req.user.id, 'PAUSE_AD', 'Advertisement', id);
    return result;
  }
}
