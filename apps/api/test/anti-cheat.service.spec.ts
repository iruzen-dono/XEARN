import { Test, TestingModule } from '@nestjs/testing';
import { AntiCheatService, FingerprintData } from '../src/auth/anti-cheat.service';
import { PrismaService } from '../src/prisma/prisma.service';

const mockPrisma = {
  deviceFingerprint: {
    upsert: jest.fn(),
    findMany: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
  $queryRaw: jest.fn(),
};

describe('AntiCheatService', () => {
  let service: AntiCheatService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AntiCheatService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<AntiCheatService>(AntiCheatService);
  });

  describe('recordFingerprint', () => {
    const userId = 'user-1';
    const data: FingerprintData = {
      fingerprint: 'fp-abc123',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    it('should return not suspicious when no empty fingerprint', async () => {
      const result = await service.recordFingerprint(userId, { fingerprint: '' });
      expect(result.suspicious).toBe(false);
      expect(result.matchedAccounts).toEqual([]);
      expect(mockPrisma.deviceFingerprint.upsert).not.toHaveBeenCalled();
    });

    it('should upsert fingerprint and detect no multi-account', async () => {
      mockPrisma.deviceFingerprint.upsert.mockResolvedValue({});
      mockPrisma.deviceFingerprint.findMany.mockResolvedValue([]);

      const result = await service.recordFingerprint(userId, data);

      expect(result.suspicious).toBe(false);
      expect(result.matchedAccounts).toEqual([]);
      expect(mockPrisma.deviceFingerprint.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_fingerprint: { userId, fingerprint: data.fingerprint } },
        }),
      );
    });

    it('should detect multi-account by fingerprint', async () => {
      mockPrisma.deviceFingerprint.upsert.mockResolvedValue({});

      // First call: fingerprint match
      mockPrisma.deviceFingerprint.findMany
        .mockResolvedValueOnce([{ userId: 'user-2' }]) // by fingerprint
        .mockResolvedValueOnce([]); // by IP

      const result = await service.recordFingerprint(userId, data);

      expect(result.suspicious).toBe(true);
      expect(result.matchedAccounts).toContain('user-2');
    });

    it('should detect multi-account by IP', async () => {
      mockPrisma.deviceFingerprint.upsert.mockResolvedValue({});

      mockPrisma.deviceFingerprint.findMany
        .mockResolvedValueOnce([]) // by fingerprint
        .mockResolvedValueOnce([{ userId: 'user-3' }]); // by IP

      const result = await service.recordFingerprint(userId, data);

      expect(result.suspicious).toBe(true);
      expect(result.matchedAccounts).toContain('user-3');
    });

    it('should deduplicate matched accounts from fingerprint + IP', async () => {
      mockPrisma.deviceFingerprint.upsert.mockResolvedValue({});

      mockPrisma.deviceFingerprint.findMany
        .mockResolvedValueOnce([{ userId: 'user-2' }, { userId: 'user-3' }]) // by fingerprint
        .mockResolvedValueOnce([{ userId: 'user-2' }, { userId: 'user-4' }]); // by IP

      const result = await service.recordFingerprint(userId, data);

      expect(result.suspicious).toBe(true);
      expect(result.matchedAccounts).toHaveLength(3);
      expect(result.matchedAccounts).toEqual(
        expect.arrayContaining(['user-2', 'user-3', 'user-4']),
      );
    });

    it('should skip IP check when ipAddress is absent', async () => {
      mockPrisma.deviceFingerprint.upsert.mockResolvedValue({});
      mockPrisma.deviceFingerprint.findMany.mockResolvedValue([]);

      const noIpData: FingerprintData = { fingerprint: 'fp-xyz', userAgent: 'bot' };
      const result = await service.recordFingerprint(userId, noIpData);

      expect(result.suspicious).toBe(false);
      // findMany should be called only once (fingerprint only, not IP)
      expect(mockPrisma.deviceFingerprint.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('getUserFingerprints', () => {
    it('should return fingerprint history for a user', async () => {
      const fingerprints = [
        { id: 'fp-1', fingerprint: 'abc', ipAddress: '1.1.1.1', lastSeenAt: new Date() },
      ];
      mockPrisma.deviceFingerprint.findMany.mockResolvedValue(fingerprints);

      const result = await service.getUserFingerprints('user-1');
      expect(result).toEqual(fingerprints);
      expect(mockPrisma.deviceFingerprint.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { lastSeenAt: 'desc' },
      });
    });
  });
});
