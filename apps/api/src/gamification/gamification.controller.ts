import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { JwtRequest } from '../common/types';

@Controller('gamification')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  /** Get current user's streak info */
  @Get('streak')
  @Roles('USER', 'PARTNER', 'ADMIN')
  async getStreak(@Req() req: JwtRequest) {
    return this.gamificationService.getStreak(req.user.id);
  }

  /** Get all badges (earned + available) for current user */
  @Get('badges')
  @Roles('USER', 'PARTNER', 'ADMIN')
  async getBadges(@Req() req: JwtRequest) {
    return this.gamificationService.getUserBadges(req.user.id);
  }

  /** Get streak leaderboard */
  @Get('leaderboard')
  @Roles('USER', 'PARTNER', 'ADMIN')
  async getLeaderboard(@Query('limit') limit?: string) {
    const parsedLimit = limit ? Math.min(parseInt(limit, 10) || 20, 100) : 20;
    return this.gamificationService.getStreakLeaderboard(parsedLimit);
  }
}
