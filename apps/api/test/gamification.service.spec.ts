import { Test, TestingModule } from '@nestjs/testing';
import { GamificationService } from '../src/gamification/gamification.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { BadgeCategory } from '@prisma/client';

const mockPrisma = {
  $transaction: jest.fn().mockImplementation((args) => {
    // Support batch $transaction([...]) by resolving each promise
    if (Array.isArray(args)) return Promise.all(args);
    // Support interactive $transaction(fn) — pass mockPrisma as tx
    return args(mockPrisma);
  }),
  badge: {
    upsert: jest.fn().mockResolvedValue({}),
    findMany: jest.fn(),
  },
  userStreak: {
    upsert: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  userBadge: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  taskCompletion: {
    count: jest.fn(),
  },
  user: {
    count: jest.fn(),
  },
  wallet: {
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  },
  transaction: {
    create: jest.fn(),
  },
};

const mockNotifications = {
  create: jest.fn().mockResolvedValue({}),
};

describe('GamificationService', () => {
  let service: GamificationService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamificationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<GamificationService>(GamificationService);
  });

  describe('recordActivity', () => {
    const userId = 'user-1';

    it('should create streak on first activity', async () => {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      // First upsert returns a new record with lastActivityDate = today
      mockPrisma.userStreak.upsert.mockResolvedValue({
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: today,
      });
      // No unearned badges
      mockPrisma.badge.findMany.mockResolvedValue([]);

      const result = await service.recordActivity(userId);

      expect(mockPrisma.userStreak.upsert).toHaveBeenCalled();
      // Same day → should return existing streak without updating
      expect(result.currentStreak).toBe(1);
      expect(result.newBadges).toEqual([]);
    });

    it('should increment streak on consecutive days', async () => {
      const yesterday = new Date();
      yesterday.setUTCHours(0, 0, 0, 0);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);

      mockPrisma.userStreak.upsert.mockResolvedValue({
        userId,
        currentStreak: 2,
        longestStreak: 2,
        lastActivityDate: yesterday,
      });
      mockPrisma.userStreak.update.mockResolvedValue({});
      mockPrisma.badge.findMany.mockResolvedValue([]);

      const result = await service.recordActivity(userId);

      expect(mockPrisma.userStreak.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
          data: expect.objectContaining({
            currentStreak: 3,
          }),
        }),
      );
      expect(result.currentStreak).toBe(3);
    });

    it('should reset streak when day is skipped', async () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setUTCHours(0, 0, 0, 0);
      twoDaysAgo.setUTCDate(twoDaysAgo.getUTCDate() - 2);

      mockPrisma.userStreak.upsert.mockResolvedValue({
        userId,
        currentStreak: 5,
        longestStreak: 10,
        lastActivityDate: twoDaysAgo,
      });
      mockPrisma.userStreak.update.mockResolvedValue({});
      mockPrisma.badge.findMany.mockResolvedValue([]);

      const result = await service.recordActivity(userId);

      expect(mockPrisma.userStreak.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentStreak: 1,
            longestStreak: 10, // longest stays 10
          }),
        }),
      );
      expect(result.currentStreak).toBe(1);
    });

    it('should award streak badge when threshold reached', async () => {
      const yesterday = new Date();
      yesterday.setUTCHours(0, 0, 0, 0);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);

      mockPrisma.userStreak.upsert.mockResolvedValue({
        userId,
        currentStreak: 2,
        longestStreak: 2,
        lastActivityDate: yesterday,
      });
      mockPrisma.userStreak.update.mockResolvedValue({});
      // Return an unearned streak badge with threshold ≤ 3
      mockPrisma.badge.findMany.mockResolvedValue([
        {
          id: 'badge-1',
          code: 'streak_3',
          name: '🔥 3 jours',
          reward: 100,
          icon: '🔥',
          description: 'test',
        },
      ]);
      mockPrisma.userBadge.create.mockResolvedValue({});
      mockPrisma.wallet.updateMany.mockResolvedValue({});
      mockPrisma.transaction.create.mockResolvedValue({});

      const result = await service.recordActivity(userId);

      expect(result.currentStreak).toBe(3);
      expect(result.newBadges).toContain('🔥 3 jours');
      expect(mockPrisma.userBadge.create).toHaveBeenCalledWith({
        data: { userId, badgeId: 'badge-1' },
      });
      expect(mockPrisma.wallet.updateMany).toHaveBeenCalled();
      expect(mockPrisma.transaction.create).toHaveBeenCalled();
      expect(mockNotifications.create).toHaveBeenCalled();
    });
  });

  describe('checkTaskBadges', () => {
    it('should count tasks and check for badges', async () => {
      mockPrisma.taskCompletion.count.mockResolvedValue(55);
      mockPrisma.badge.findMany.mockResolvedValue([]); // no unearned badges

      const result = await service.checkTaskBadges('user-1');

      expect(mockPrisma.taskCompletion.count).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
      expect(result).toEqual([]);
    });
  });

  describe('checkReferralBadges', () => {
    it('should count referrals and check for badges', async () => {
      mockPrisma.user.count.mockResolvedValue(3);
      mockPrisma.badge.findMany.mockResolvedValue([]);

      const result = await service.checkReferralBadges('user-1');

      expect(mockPrisma.user.count).toHaveBeenCalledWith({ where: { referredById: 'user-1' } });
      expect(result).toEqual([]);
    });
  });

  describe('checkEarningsBadges', () => {
    it('should return empty when no wallet', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(null);

      const result = await service.checkEarningsBadges('user-1');
      expect(result).toEqual([]);
    });

    it('should check earnings against badge thresholds', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue({ totalEarned: 60000 });
      mockPrisma.badge.findMany.mockResolvedValue([]);

      const result = await service.checkEarningsBadges('user-1');

      expect(mockPrisma.wallet.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        select: { totalEarned: true },
      });
      expect(result).toEqual([]);
    });
  });

  describe('getStreak', () => {
    it('should return zero streak when no record exists', async () => {
      mockPrisma.userStreak.findUnique.mockResolvedValue(null);

      const result = await service.getStreak('user-1');

      expect(result).toEqual({ currentStreak: 0, longestStreak: 0, lastActivityDate: null });
    });

    it('should return active streak when last activity was today', async () => {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      mockPrisma.userStreak.findUnique.mockResolvedValue({
        currentStreak: 5,
        longestStreak: 10,
        lastActivityDate: today,
      });

      const result = await service.getStreak('user-1');
      expect(result.currentStreak).toBe(5);
      expect(result.longestStreak).toBe(10);
    });

    it('should return zero streak when last activity was 2+ days ago', async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setUTCDate(threeDaysAgo.getUTCDate() - 3);

      mockPrisma.userStreak.findUnique.mockResolvedValue({
        currentStreak: 5,
        longestStreak: 10,
        lastActivityDate: threeDaysAgo,
      });

      const result = await service.getStreak('user-1');
      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(10);
    });
  });

  describe('getUserBadges', () => {
    it('should return badges with earned status', async () => {
      mockPrisma.badge.findMany.mockResolvedValue([
        {
          id: 'b1',
          code: 'streak_3',
          name: 'Streak 3',
          category: BadgeCategory.STREAK,
          threshold: 3,
        },
        {
          id: 'b2',
          code: 'tasks_10',
          name: 'Tasks 10',
          category: BadgeCategory.TASKS,
          threshold: 10,
        },
      ]);
      mockPrisma.userBadge.findMany.mockResolvedValue([
        { badgeId: 'b1', earnedAt: new Date('2025-01-15') },
      ]);

      const result = await service.getUserBadges('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].earned).toBe(true);
      expect(result[0].earnedAt).toEqual(new Date('2025-01-15'));
      expect(result[1].earned).toBe(false);
      expect(result[1].earnedAt).toBeNull();
    });
  });

  describe('getStreakLeaderboard', () => {
    it('should return top streaks with user info', async () => {
      const expected = [
        { currentStreak: 10, user: { id: 'u1', firstName: 'A' } },
        { currentStreak: 7, user: { id: 'u2', firstName: 'B' } },
      ];
      mockPrisma.userStreak.findMany.mockResolvedValue(expected);

      const result = await service.getStreakLeaderboard(5);

      expect(result).toEqual(expected);
      expect(mockPrisma.userStreak.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { currentStreak: { gt: 0 } },
          orderBy: { currentStreak: 'desc' },
          take: 5,
        }),
      );
    });
  });
});
