import { Decimal } from '@prisma/client/runtime/library';
import { ConfigService } from '@nestjs/config';
import { ReferralsService } from '../src/referrals/referrals.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { NotificationsService } from '../src/notifications/notifications.service';

describe('ReferralsService', () => {
  const mockConfigService = {
    get: jest.fn((key: string) => {
      const map: Record<string, number> = {
        REFERRAL_LEVEL1_PERCENT: 40,
        REFERRAL_LEVEL2_PERCENT: 10,
        REFERRAL_LEVEL3_PERCENT: 5,
      };
      return map[key] ?? null;
    }),
  };

  const mockNotifications = {
    notifyCommission: jest.fn(),
  };

  const mockPrisma = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    commission: {
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      create: jest.fn(),
    },
    wallet: {
      update: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  let service: ReferralsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReferralsService(
      mockPrisma as unknown as PrismaService,
      mockConfigService as unknown as ConfigService,
      mockNotifications as unknown as NotificationsService,
      { checkReferralBadges: jest.fn().mockResolvedValue([]) } as any,
    );
  });

  describe('getReferralTree', () => {
    it('returns level 3 referrals for VIP users', async () => {
      mockPrisma.user.findMany
        .mockResolvedValueOnce([
          {
            id: 'l1-1',
            firstName: 'L1',
            lastName: 'One',
            status: 'ACTIVATED',
            createdAt: new Date(),
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'l2-1',
            firstName: 'L2',
            lastName: 'One',
            status: 'ACTIVATED',
            createdAt: new Date(),
            referredById: 'l1-1',
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'l3-1',
            firstName: 'L3',
            lastName: 'One',
            status: 'ACTIVATED',
            createdAt: new Date(),
            referredById: 'l2-1',
          },
        ]);
      mockPrisma.user.findUnique.mockResolvedValueOnce({ tier: 'VIP' });

      const tree = await service.getReferralTree('root-user');

      expect(tree.level1).toHaveLength(1);
      expect(tree.level2).toHaveLength(1);
      expect(tree.level3).toHaveLength(1);
      expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(3);
    });
  });

  describe('getStats', () => {
    it('returns referral stats with VIP level 3 activation flag', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ tier: 'VIP' });
      mockPrisma.user.count
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1);
      mockPrisma.commission.aggregate
        .mockResolvedValueOnce({ _sum: { amount: '150' } })
        .mockResolvedValueOnce({ _sum: { amount: '80' } })
        .mockResolvedValueOnce({ _sum: { amount: '50' } })
        .mockResolvedValueOnce({ _sum: { amount: '20' } });

      const stats = await service.getStats('root-user');

      expect(stats).toEqual({
        totalLevel1: 3,
        totalLevel2: 2,
        totalLevel3: 1,
        totalCommissions: 150,
        commissionsL1: 80,
        commissionsL2: 50,
        commissionsL3: 20,
        l1Percent: 40,
        l2Percent: 10,
        l3Percent: 5,
        userTier: 'VIP',
        l3Active: true,
      });
    });
  });

  describe('distributeCommissions', () => {
    it('awards L1, L2 and L3 commissions when the chain is eligible', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'child-user',
        firstName: 'Child',
        lastName: 'User',
        referredBy: {
          id: 'l1-user',
          status: 'ACTIVATED',
          tier: 'NORMAL',
          firstName: 'L1',
          lastName: 'Referrer',
          referredBy: {
            id: 'l2-user',
            status: 'ACTIVATED',
            tier: 'PREMIUM',
            firstName: 'L2',
            lastName: 'Referrer',
            referredBy: {
              id: 'l3-user',
              status: 'ACTIVATED',
              tier: 'VIP',
              firstName: 'L3',
              lastName: 'Referrer',
            },
          },
        },
      });
      mockPrisma.commission.create.mockResolvedValue({});
      mockPrisma.wallet.update.mockResolvedValue({});
      mockPrisma.transaction.create.mockResolvedValue({});
      mockPrisma.$transaction.mockResolvedValue([]);

      await service.distributeCommissions('child-user', new Decimal(100));

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.commission.create).toHaveBeenCalledTimes(3);
      expect(mockPrisma.wallet.update).toHaveBeenCalledTimes(3);
      expect(mockPrisma.transaction.create).toHaveBeenCalledTimes(3);
      expect(mockNotifications.notifyCommission).toHaveBeenCalledWith(
        'l1-user',
        40,
        1,
        'Child User',
      );
      expect(mockNotifications.notifyCommission).toHaveBeenCalledWith(
        'l2-user',
        10,
        2,
        'Child User',
      );
      expect(mockNotifications.notifyCommission).toHaveBeenCalledWith(
        'l3-user',
        5,
        3,
        'Child User',
      );
    });
  });
});
