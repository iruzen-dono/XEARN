import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { WalletService } from './wallet.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { WithdrawDto } from './dto/withdraw.dto';
import { UpgradeTierDto } from './dto/upgrade-tier.dto';
import { JwtRequest } from '../common/types';

@Controller('wallet')
export class WalletController {
  constructor(
    private walletService: WalletService,
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getWallet(@Request() req: JwtRequest) {
    return this.walletService.getWallet(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('transactions')
  async getTransactions(
    @Request() req: JwtRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.walletService.getTransactions(
      req.user.id,
      Math.max(1, parseInt(page || '') || 1),
      Math.min(Math.max(1, parseInt(limit || '') || 20), 100),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post('activate')
  async activateAccount(@Request() req: JwtRequest) {
    return this.walletService.activateAccount(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('withdraw')
  async requestWithdrawal(@Request() req: JwtRequest, @Body() dto: WithdrawDto) {
    return this.walletService.requestWithdrawal(
      req.user.id,
      dto.amount,
      dto.method,
      dto.accountInfo,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('withdrawals')
  async getWithdrawals(@Request() req: JwtRequest) {
    return this.walletService.getWithdrawals(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/stats')
  async getGlobalStats() {
    return this.walletService.getGlobalStats();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/withdrawals')
  async getPendingWithdrawals(@Query('page') page?: string) {
    return this.walletService.getPendingWithdrawals(Math.max(1, parseInt(page || '') || 1));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('admin/withdrawals/:id/approve')
  async approveWithdrawal(@Request() req: JwtRequest, @Param('id') id: string) {
    const result = await this.walletService.approveWithdrawal(id);
    await this.auditLog.log(req.user.id, 'APPROVE_WITHDRAWAL', 'Withdrawal', id);
    return result;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('admin/withdrawals/:id/reject')
  async rejectWithdrawal(@Request() req: JwtRequest, @Param('id') id: string) {
    const result = await this.walletService.rejectWithdrawal(id);
    await this.auditLog.log(req.user.id, 'REJECT_WITHDRAWAL', 'Withdrawal', id);
    return result;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/export/transactions')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportTransactionsCsv(@Res() res: Response) {
    const transactions = await this.prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10000,
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
    const header = 'id,userId,userName,email,type,status,amount,description,createdAt\n';
    const rows = transactions
      .map((t) =>
        [
          t.id,
          t.userId,
          this.csvSafe(`${t.user.firstName} ${t.user.lastName}`),
          this.csvSafe(t.user.email || ''),
          t.type,
          t.status,
          t.amount,
          `"${(t.description || '').replace(/"/g, '""')}"`,
          t.createdAt.toISOString(),
        ].join(','),
      )
      .join('\n');
    res.setHeader('Content-Disposition', 'attachment; filename=xearn-transactions.csv');
    res.send(header + rows);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/export/withdrawals')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportWithdrawalsCsv(@Res() res: Response) {
    const withdrawals = await this.prisma.withdrawal.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10000,
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
    const header =
      'id,userId,userName,email,amount,method,status,accountInfo,processedAt,createdAt\n';
    const rows = withdrawals
      .map((w) =>
        [
          w.id,
          w.userId,
          this.csvSafe(`${w.user.firstName} ${w.user.lastName}`),
          this.csvSafe(w.user.email || ''),
          w.amount,
          w.method,
          w.status,
          `"${this.csvSafe(w.accountInfo).replace(/"/g, '""')}"`,
          w.processedAt?.toISOString() || '',
          w.createdAt.toISOString(),
        ].join(','),
      )
      .join('\n');
    res.setHeader('Content-Disposition', 'attachment; filename=xearn-withdrawals.csv');
    res.send(header + rows);
  }

  /** Escape CSV values to prevent formula injection (=, +, -, @, \t, \r) */
  private csvSafe(value: string): string {
    if (/^[=+\-@\t\r]/.test(value)) {
      return `'${value}`;
    }
    return value;
  }

  @UseGuards(JwtAuthGuard)
  @Get('payment-info')
  async getPaymentInfo() {
    return {
      supportedMethods: [
        'MTN_MOMO',
        'FLOOZ',
        'TMONEY',
        'ORANGE_MONEY',
        'VISA',
        'MASTERCARD',
        'PAYPAL',
      ],
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('fees')
  async getWithdrawalFees(@Request() req: JwtRequest) {
    return this.walletService.getWithdrawalFees(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('tier-pricing')
  async getTierPricing() {
    return this.walletService.getTierPricing();
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post('upgrade-tier')
  async upgradeTier(@Request() req: JwtRequest, @Body() dto: UpgradeTierDto) {
    return this.walletService.upgradeTier(req.user.id, dto.tier);
  }
}
