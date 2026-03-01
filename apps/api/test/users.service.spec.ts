import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UsersService } from '../src/users/users.service';
import { PrismaService } from '../src/prisma/prisma.service';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // ─── findById ──────────────────────────────────────
  describe('findById', () => {
    it('should return user without password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        firstName: 'A',
        lastName: 'B',
      });

      const result = await service.findById('u1');
      expect(result).toBeDefined();
      expect(result?.email).toBe('a@b.com');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'u1' }, omit: { password: true } }),
      );
    });

    it('should return null if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await service.findById('nonexistent');
      expect(result).toBeNull();
    });
  });

  // ─── findAll ───────────────────────────────────────
  describe('findAll', () => {
    it('should return paginated users', async () => {
      const users = [
        { id: 'u1', firstName: 'A', lastName: 'B' },
        { id: 'u2', firstName: 'C', lastName: 'D' },
      ];
      mockPrisma.user.findMany.mockResolvedValue(users);
      mockPrisma.user.count.mockResolvedValue(2);

      const result = await service.findAll(1, 20);
      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should apply status filter', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.findAll(1, 20, undefined, 'ACTIVATED');
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'ACTIVATED' }) }),
      );
    });

    it('should apply search filter', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.findAll(1, 20, 'amadou');
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }),
      );
    });
  });

  // ─── reactivateUser ────────────────────────────────
  describe('reactivateUser', () => {
    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.reactivateUser('nobody')).rejects.toThrow('Utilisateur introuvable');
    });

    it('should throw if already activated', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', status: 'ACTIVATED' });
      await expect(service.reactivateUser('u1')).rejects.toThrow('déjà activé');
    });

    it('should reactivate a suspended user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', status: 'SUSPENDED' });
      mockPrisma.user.update.mockResolvedValue({ id: 'u1', status: 'ACTIVATED' });

      const result = await service.reactivateUser('u1');
      expect(result.status).toBe('ACTIVATED');
    });
  });

  // ─── suspendUser ───────────────────────────────────
  describe('suspendUser', () => {
    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.suspendUser('nobody')).rejects.toThrow('Utilisateur introuvable');
    });

    it('should throw if user is admin', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'ADMIN', status: 'ACTIVATED' });
      await expect(service.suspendUser('u1')).rejects.toThrow('admin');
    });

    it('should throw if already suspended', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'USER', status: 'SUSPENDED' });
      await expect(service.suspendUser('u1')).rejects.toThrow('déjà suspendu');
    });

    it('should suspend an active user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'USER', status: 'ACTIVATED' });
      mockPrisma.user.update.mockResolvedValue({ id: 'u1', status: 'SUSPENDED' });

      const result = await service.suspendUser('u1');
      expect(result.status).toBe('SUSPENDED');
    });
  });

  // ─── banUser ───────────────────────────────────────
  describe('banUser', () => {
    it('should throw if admin', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'ADMIN', status: 'ACTIVATED' });
      await expect(service.banUser('u1')).rejects.toThrow('admin');
    });

    it('should ban a user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'USER', status: 'ACTIVATED' });
      mockPrisma.user.update.mockResolvedValue({ id: 'u1', status: 'BANNED' });

      const result = await service.banUser('u1');
      expect(result.status).toBe('BANNED');
    });
  });
});
