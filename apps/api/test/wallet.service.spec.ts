import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WalletService } from '../src/wallet/wallet.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { PaymentService } from '../src/payment/payment.service';
import { NotificationsService } from '../src/notifications/notifications.service';

// Mock Decimal
class MockDecimal {
  private val: number;
  constructor(v: any) { this.val = Number(v); }
  lessThan(other: MockDecimal) { return this.val < other.val; }
  toString() { return this.val.toFixed(2); }
}

const mockPrisma = {
  wallet: { findUnique: jest.fn() },
  withdrawal: { aggregate: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
  transaction: { findMany: jest.fn(), count: jest.fn(), create: jest.fn(), updateMany: jest.fn() },
  user: { findUnique: jest.fn(), update: jest.fn() },
  $transaction: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const map: Record<string, any> = {
      ACTIVATION_PRICE_FCFA: 4000,
      WITHDRAWAL_MIN_FCFA: 2000,
    };
    return map[key] ?? null;
  }),
};

const mockPaymentService = {
  getProvider: jest.fn().mockReturnValue({
    name: 'mock',
    collect: jest.fn().mockResolvedValue({ status: 'completed', providerTransactionId: 'tx-123' }),
    disburse: jest.fn().mockResolvedValue({ status: 'completed', providerTransactionId: 'tx-456' }),
  }),
};

const mockNotifications = {
  notifyAccountActivated: jest.fn(),
  notifyWithdrawalCompleted: jest.fn(),
};

describe('WalletService', () => {
  let service: WalletService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PaymentService, useValue: mockPaymentService },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  // ─── getWallet ─────────────────────────────────────
  describe('getWallet', () => {
    it('should return null if no wallet found', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(null);
      const result = await service.getWallet('user-1');
      expect(result).toBeNull();
    });

    it('should return wallet with withdrawal stats', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue({
        userId: 'user-1',
        balance: '500.00',
        totalEarned: '1000.00',
      });
      mockPrisma.withdrawal.aggregate
        .mockResolvedValueOnce({ _sum: { amount: '300.00' } })  // completed
        .mockResolvedValueOnce({ _sum: { amount: '100.00' } });  // pending

      const result = await service.getWallet('user-1');
      expect(result).toBeDefined();
      expect(result!.totalWithdrawn).toBe('300.00');
      expect(result!.pendingWithdrawal).toBe('100.00');
    });
  });

  // ─── getTransactions ───────────────────────────────
  describe('getTransactions', () => {
    it('should return paginated transactions', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([{ id: 'tx-1' }]);
      mockPrisma.transaction.count.mockResolvedValue(1);

      const result = await service.getTransactions('user-1', 1, 20);
      expect(result.transactions).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });
  });

  // ─── activateAccount ───────────────────────────────
  describe('activateAccount', () => {
    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.activateAccount('nobody')).rejects.toThrow('Utilisateur introuvable');
    });

    it('should throw if already activated', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        status: 'ACTIVATED',
        wallet: { balance: '10000' },
      });
      await expect(service.activateAccount('u1')).rejects.toThrow('Compte déjà activé');
    });

    it('should throw for suspended users', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        status: 'SUSPENDED',
        wallet: { balance: '10000' },
      });
      await expect(service.activateAccount('u1')).rejects.toThrow('Compte suspendu ou banni');
    });

    it('should activate on successful mock payment', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        status: 'FREE',
        firstName: 'A',
        lastName: 'B',
        email: 'a@b.com',
        wallet: { balance: '10000' },
      });
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.activateAccount('u1');
      expect(result.status).toBe('completed');
      expect(result.success).toBe(true);
    });
  });

  // ─── requestWithdrawal ─────────────────────────────
  describe('requestWithdrawal', () => {
    it('should throw if amount below minimum', async () => {
      await expect(
        service.requestWithdrawal('u1', 500, 'MTN_MOMO', '+22890000000'),
      ).rejects.toThrow('Montant minimum');
    });

    it('should throw if account is not activated', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', status: 'FREE' });
      await expect(
        service.requestWithdrawal('u1', 5000, 'MTN_MOMO', '+22890000000'),
      ).rejects.toThrow('Compte non activé');
    });
  });
});
