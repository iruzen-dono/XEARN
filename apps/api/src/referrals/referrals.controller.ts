import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { JwtAuthGuard } from '../auth/guards';

@Controller('referrals')
export class ReferralsController {
  constructor(private referralsService: ReferralsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('tree')
  async getReferralTree(@Request() req: any) {
    return this.referralsService.getReferralTree(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('commissions')
  async getCommissions(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.referralsService.getCommissions(
      req.user.id,
      Math.max(1, parseInt(page || '') || 1),
      Math.min(Math.max(1, parseInt(limit || '') || 20), 100),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getStats(@Request() req: any) {
    return this.referralsService.getStats(req.user.id);
  }
}
