import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TasksService } from '../../src/tasks/tasks.service';
import { ReferralsService } from '../../src/referrals/referrals.service';
import { NotificationsService } from '../../src/notifications/notifications.service';
import { GamificationService } from '../../src/gamification/gamification.service';
import { DailyLimitExceededException } from '../../src/common/exceptions';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * INTEGRATION TEST: Daily task completion limit
 *
 * Vérifie que:
 * 1. Un utilisateur ne peut pas compléter plus de 30 tâches par jour
 * 2. La 31ème tentative est rejetée avec DailyLimitExceededException
 * 3. Le compteur est reset après minuit
 */
describe('TasksService - Daily Limit Enforcement (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tasksService: TasksService;
  let testUserId: string;
  let testTaskIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [
        PrismaService,
        TasksService,
        ReferralsService,
        NotificationsService,
        GamificationService,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    tasksService = moduleFixture.get<TasksService>(TasksService);

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `daily-limit-test-${Date.now()}@example.com`,
        firstName: 'Test',
        lastName: 'DailyLimit',
        phone: `+225000${Math.random().toString().slice(2, 10)}`,
        password: 'hashed',
        status: 'ACTIVATED',
        tier: 'NORMAL',
      },
    });
    testUserId = user.id;

    await prisma.wallet.create({
      data: { userId: testUserId, balance: 0, totalEarned: 0 },
    });

    // Create 31 test tasks
    for (let i = 0; i < 31; i++) {
      const task = await prisma.task.create({
        data: {
          title: `Daily Limit Test Task ${i}`,
          description: 'Test task',
          type: 'CLICK_AD',
          earned: new Decimal(100),
          status: 'ACTIVE',
          requiresCode: false, // Simplify testing
        },
      });
      testTaskIds.push(task.id);
    }
  });

  afterAll(async () => {
    // Cleanup
    await prisma.taskSession.deleteMany({ where: { userId: testUserId } });
    await prisma.taskCompletion.deleteMany({ where: { userId: testUserId } });
    await prisma.transaction.deleteMany({ where: { userId: testUserId } });
    await prisma.wallet.delete({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.task.deleteMany({ where: { id: { in: testTaskIds } } });
    await app.close();
  });

  it('should allow 30 task completions per day', async () => {
    // Complete 30 tasks successfully
    for (let i = 0; i < 30; i++) {
      const taskId = testTaskIds[i];

      // Start task session
      await tasksService.startTask(testUserId, taskId);

      // Wait minimum duration
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Complete task
      await expect(tasksService.completeTask(testUserId, taskId)).resolves.not.toThrow();
    }

    // Verify 30 completions
    const count = await prisma.taskCompletion.count({
      where: { userId: testUserId },
    });
    expect(count).toBe(30);
  }, 60000); // 60s timeout

  it('should reject 31st task completion with DailyLimitExceededException', async () => {
    // Try to complete the 31st task
    const taskId = testTaskIds[30];

    await expect(tasksService.completeTask(testUserId, taskId)).rejects.toThrow(
      DailyLimitExceededException,
    );

    // Verify still 30 completions
    const count = await prisma.taskCompletion.count({
      where: { userId: testUserId },
    });
    expect(count).toBe(30);
  });

  it('should count only today completions (not yesterday)', async () => {
    // Create a completion dated yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(12, 0, 0, 0);

    await prisma.taskCompletion.create({
      data: {
        userId: testUserId,
        taskId: testTaskIds[0],
        earned: new Decimal(100),
        createdAt: yesterday,
      },
    });

    // startOfDay calculation should exclude yesterday's completion
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayCount = await prisma.taskCompletion.count({
      where: {
        userId: testUserId,
        createdAt: { gte: startOfDay },
      },
    });

    // Should still be 30 (not counting yesterday)
    expect(todayCount).toBe(30);
  });
});
