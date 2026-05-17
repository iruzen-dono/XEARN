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
 * INTEGRATION TEST: Concurrent commission distribution
 *
 * Vérifie que:
 * 1. Deux commissions concurrentes sur des chaînes croisées ne provoquent pas de deadlock
 * 2. Le locking déterministe par userId (tri) évite le problème
 * 3. Toutes les commissions sont distribuées correctement
 */
describe('ReferralsService - Concurrent Commissions (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let referralsService: ReferralsService;

  // Chain A: userA → userB → userC
  // Chain E: userE → userB → userF
  // Both chains have userB in common → potential deadlock if not locked correctly
  let userA: string, userB: string, userC: string, userE: string, userF: string;

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

    // Create users
    const createUser = async (email: string, referredBy?: string) => {
      const user = await prisma.user.create({
        data: {
          email: `${email}-${Date.now()}@example.com`,
          firstName: email,
          lastName: 'Test',
          phone: `+225000${Math.random().toString().slice(2, 10)}`,
          password: 'hashed',
          status: 'ACTIVATED',
          tier: 'PREMIUM',
          ...(referredBy && { referredById: referredBy }),
        },
      });
      await prisma.wallet.create({
        data: { userId: user.id, balance: 0, totalEarned: 0 },
      });
      return user.id;
    };

    // Build chains
    userC = await createUser('userC');
    userB = await createUser('userB', userC);
    userA = await createUser('userA', userB);

    userF = await createUser('userF');
    // userB is already created, so we update userE to refer to userB
    userE = await createUser('userE-temp');
    await prisma.user.update({
      where: { id: userE },
      data: { referredById: userB },
    });

    // Create task for testing
    await prisma.task.create({
      data: {
        id: 'test-task-concurrent-commissions',
        title: 'Test Task',
        type: 'EXTERNAL',
        reward: new Decimal(1000),
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.commission.deleteMany({
      where: { beneficiaryId: { in: [userA, userB, userC, userE, userF] } },
    });
    await prisma.taskCompletion.deleteMany({
      where: { userId: { in: [userA, userB, userC, userE, userF] } },
    });
    await prisma.transaction.deleteMany({
      where: { userId: { in: [userA, userB, userC, userE, userF] } },
    });
    await prisma.wallet.deleteMany({
      where: { userId: { in: [userA, userB, userC, userE, userF] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userA, userB, userC, userE, userF] } },
    });
    await prisma.task.delete({ where: { id: 'test-task-concurrent-commissions' } });
    await app.close();
  });

  it('should handle concurrent commissions without deadlock', async () => {
    // Simulate concurrent task completions:
    // userA completes task (chain A→B→C)
    // userE completes task (chain E→B→F)
    // Both trigger commissions that lock userB → potential deadlock if not sorted

    const completionA = prisma.taskCompletion.create({
      data: {
        userId: userA,
        taskId: 'test-task-concurrent-commissions',
        earned: new Decimal(1000),
      },
    });

    const completionE = prisma.taskCompletion.create({
      data: {
        userId: userE,
        taskId: 'test-task-concurrent-commissions',
        earned: new Decimal(1000),
      },
    });

    const [compA, compE] = await Promise.all([completionA, completionE]);

    // Distribute commissions concurrently (this is where deadlock could occur)
    const commission1 = referralsService.distributeCommissions(userA, new Decimal(1000), compA.id);
    const commission2 = referralsService.distributeCommissions(userE, new Decimal(1000), compE.id);

    // Should complete without timeout or deadlock
    await expect(Promise.all([commission1, commission2])).resolves.not.toThrow();

    // Verify userB received commissions from both chains
    const commissionsB = await prisma.commission.findMany({
      where: { beneficiaryId: userB },
    });

    expect(commissionsB.length).toBeGreaterThanOrEqual(2); // L1 from both userA and userE

    // Verify balances are correct
    const walletB = await prisma.wallet.findUnique({ where: { userId: userB } });
    const expectedCommission = 1000 * 0.4; // 40% L1 commission
    expect(Number(walletB!.balance)).toBe(expectedCommission * 2); // From both chains
  }, 30000); // 30s timeout for safety
});
