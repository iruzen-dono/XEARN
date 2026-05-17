import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaService } from '../../src/prisma/prisma.service';
import { WalletService } from '../../src/wallet/wallet.service';
import { PaymentService } from '../../src/payment/payment.service';
import { NotificationsService } from '../../src/notifications/notifications.service';
import { InsufficientBalanceException } from '../../src/common/exceptions';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * INTEGRATION TEST: Concurrent wallet withdrawals
 *
 * Vérifie que:
 * 1. Deux retraits simultanés sur le même wallet → un seul passe
 * 2. Le SELECT FOR UPDATE empêche les lost updates
 * 3. Les CHECK constraints DB empêchent les balances négatives
 */
describe('WalletService - Concurrent Withdrawals (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let walletService: WalletService;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [
        PrismaService,
        WalletService,
        PaymentService,
        NotificationsService,
        ConfigService,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    walletService = moduleFixture.get<WalletService>(WalletService);

    // Create test user with wallet
    const user = await prisma.user.create({
      data: {
        email: `concurrent-test-${Date.now()}@example.com`,
        firstName: 'Test',
        lastName: 'Concurrent',
        phone: '+22500000000',
        password: 'hashed',
        status: 'ACTIVATED',
        tier: 'PREMIUM',
      },
    });
    testUserId = user.id;

    await prisma.wallet.create({
      data: {
        userId: testUserId,
        balance: new Decimal(5000), // 5000 FCFA
        totalEarned: new Decimal(5000),
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.taskCompletion.deleteMany({ where: { userId: testUserId } });
    await prisma.transaction.deleteMany({ where: { userId: testUserId } });
    await prisma.withdrawal.deleteMany({ where: { userId: testUserId } });
    await prisma.wallet.delete({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await app.close();
  });

  it('should reject second concurrent withdrawal when balance insufficient', async () => {
    // Balance: 5000 FCFA
    // Try to withdraw 3000 FCFA twice concurrently (total 6000 > 5000)

    const withdrawal1 = walletService.requestWithdrawal(
      testUserId,
      3000,
      'MTN_MOMO',
      '+22500000000',
    );

    const withdrawal2 = walletService.requestWithdrawal(
      testUserId,
      3000,
      'MTN_MOMO',
      '+22500000000',
    );

    const results = await Promise.allSettled([withdrawal1, withdrawal2]);

    // Exactly ONE should succeed
    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(1);

    // The failed one should throw InsufficientBalanceException
    const failedResult = failed[0] as PromiseRejectedResult;
    expect(failedResult.reason).toBeInstanceOf(InsufficientBalanceException);

    // Verify final balance
    const wallet = await prisma.wallet.findUnique({ where: { userId: testUserId } });
    expect(Number(wallet!.balance)).toBe(2000); // 5000 - 3000 = 2000
  });

  it('should enforce CHECK constraint on negative balance', async () => {
    // Try to manually force a negative balance (should fail)
    await expect(
      prisma.$executeRaw`UPDATE "wallets" SET balance = -100 WHERE "userId" = ${testUserId}`,
    ).rejects.toThrow(); // PostgreSQL CHECK constraint violation
  });
});
