import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { WalletService } from './wallet.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { WithdrawDto } from './dto/withdraw.dto';

@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getWallet(@Request() req: any) {
    return this.walletService.getWallet(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('transactions')
  async getTransactions(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.walletService.getTransactions(
      req.user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post('activate')
  async activateAccount(@Request() req: any) {
    return this.walletService.activateAccount(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('withdraw')
  async requestWithdrawal(
    @Request() req: any,
    @Body() dto: WithdrawDto,
  ) {
    return this.walletService.requestWithdrawal(
      req.user.id,
      dto.amount,
      dto.method,
      dto.accountInfo,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('withdrawals')
  async getWithdrawals(@Request() req: any) {
    return this.walletService.getWithdrawals(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/stats')
  async getGlobalStats() {
    return this.walletService.getGlobalStats();
  }
}
