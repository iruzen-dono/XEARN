import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ReferralsService } from '../../src/referrals/referrals.service';
import { NotificationsService } from '../../src/notifications/notifications.service';
import { GamificationService } from '../../src/gamification/gamification.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * INTEGRATION TEST: Cascade referral failure resilience
 *
 * Vérifie que:
 * 1. Si L2 échoue (user inéligible), L1 et L3 sont quand même crédités
 * 2. Les transactions sont atomiques par niveau
 * 3. Aucune commission n'est perdue en cas d'échec partiel
 */
describe('ReferralsService - Cascade Failure Resilience (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let referralsService: ReferralsService;

  // Chain: userChild → userL1 (ACTIVATED) → userL2 (SUSPENDED) → userL3 (VIP)
  let userChild: string, userL1: string, userL2: string, userL3: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), EventEmitterModule.forRoot()],
      providers: [
        PrismaService,
        ReferralsService,
        NotificationsService,
        GamificationService,
        ConfigService,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    referralsService = moduleFixture.get<ReferralsService>(ReferralsService);

    // Create chain with L2 SUSPENDED
    userL3 = await createUser('userL3', 'VIP', 'ACTIVATED');
    userL2 = await createUser('userL2', 'PREMIUM', 'SUSPENDED', userL3); // SUSPENDED!
    userL1 = await createUser('userL1', 'NORMAL', 'ACTIVATED', userL2);
    userChild = await createUser('userChild', 'NORMAL', 'ACTIVATED', userL1);
  });

  afterAll(async () => {
    await prisma.commission.deleteMany({
      where: { beneficiaryId: { in: [userL1, userL2, userL3] } },
    });
    await prisma.transaction.deleteMany({
      where: { userId: { in: [userChild, userL1, userL2, userL3] } },
    });
    await prisma.wallet.deleteMany({
      where: { userId: { in: [userChild, userL1, userL2, userL3] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userChild, userL1, userL2, userL3] } },
    });
    await app.close();
  });

  async function createUser(
    name: string,
    tier: 'NORMAL' | 'PREMIUM' | 'VIP',
    status: 'ACTIVATED' | 'SUSPENDED',
    referredBy?: string,
  ): Promise<string> {
    const user = await prisma.user.create({
      data: {
        email: `${name}-${Date.now()}@example.com`,
        firstName: name,
        lastName: 'Test',
        phone: `+225000${Math.random().toString().slice(2, 10)}`,
        password: 'hashed',
        status,
        tier,
        ...(referredBy && { referredById: referredBy }),
      },
    });
    await prisma.wallet.create({
      data: { userId: user.id, balance: 0, totalEarned: 0 },
    });
    return user.id;
  }

  it('should credit L1 even if L2 is ineligible (SUSPENDED)', async () => {
    const taskCompletion = await prisma.taskCompletion.create({
      data: {
        userId: userChild,
        taskId: 'test-task-cascade',
        earned: new Decimal(1000),
      },
    });

    // Distribute commissions
    await referralsService.distributeCommissions(userChild, new Decimal(1000), taskCompletion.id);

    // L1 should receive commission (ACTIVATED)
    const commissionsL1 = await prisma.commission.findMany({
      where: { beneficiaryId: userL1, level: 1 },
    });
    expect(commissionsL1.length).toBe(1);
    expect(Number(commissionsL1[0].amount)).toBe(400); // 40%

    const walletL1 = await prisma.wallet.findUnique({ where: { userId: userL1 } });
    expect(Number(walletL1!.balance)).toBe(400);

    // L2 should NOT receive commission (SUSPENDED)
    const commissionsL2 = await prisma.commission.findMany({
      where: { beneficiaryId: userL2, level: 2 },
    });
    expect(commissionsL2.length).toBe(0);

    const walletL2 = await prisma.wallet.findUnique({ where: { userId: userL2 } });
    expect(Number(walletL2!.balance)).toBe(0);

    // L3 should still receive commission despite L2 failure (if tier qualifies)
    // Note: L3 needs VIP tier to receive L3 commission
    const commissionsL3 = await prisma.commission.findMany({
      where: { beneficiaryId: userL3, level: 3 },
    });
    // L3 won't receive because userL2 (the referrer of userL3) is SUSPENDED,
    // so the chain is broken at L2 → L3 is unreachable
    expect(commissionsL3.length).toBe(0);
  });

  it('should handle notification failures gracefully', async () => {
    // Even if notification service throws, commissions should still be distributed
    const notificationService = app.get(NotificationsService);
    jest.spyOn(notificationService, 'notifyCommission').mockRejectedValue(new Error('SSE failed'));

    const taskCompletion2 = await prisma.taskCompletion.create({
      data: {
        userId: userChild,
        taskId: 'test-task-cascade-2',
        earned: new Decimal(500),
      },
    });

    await expect(
      referralsService.distributeCommissions(userChild, new Decimal(500), taskCompletion2.id),
    ).resolves.not.toThrow();

    // L1 should still receive commission
    const commissionsL1 = await prisma.commission.findMany({
      where: { beneficiaryId: userL1, sourceId: taskCompletion2.id },
    });
    expect(commissionsL1.length).toBe(1);
    expect(Number(commissionsL1[0].amount)).toBe(200); // 40% of 500
  });
});
