import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AdsService } from '../src/ads/ads.service';
import { PrismaService } from '../src/prisma/prisma.service';

const mockPrisma = {
  advertisement: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('AdsService', () => {
  let service: AdsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AdsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<AdsService>(AdsService);
  });

  // ─── create ────────────────────────────────────────
  describe('create', () => {
    it('should create an ad for a publisher', async () => {
      const dto = { title: 'Promo Test', description: 'Desc' };
      mockPrisma.advertisement.create.mockResolvedValue({
        id: 'ad-1',
        publisherId: 'pub-1',
        ...dto,
        status: 'PENDING',
      });

      const result = await service.create('pub-1', dto as any);
      expect(result.id).toBe('ad-1');
      expect(result.publisherId).toBe('pub-1');
      expect(mockPrisma.advertisement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ publisherId: 'pub-1', title: 'Promo Test' }),
        }),
      );
    });
  });

  // ─── findActive ────────────────────────────────────
  describe('findActive', () => {
    it('should return active non-expired ads with pagination', async () => {
      mockPrisma.advertisement.findMany.mockResolvedValue([
        { id: 'ad-1', status: 'ACTIVE', budget: null, spent: 0 },
      ]);
      mockPrisma.advertisement.count.mockResolvedValue(1);

      const result = await service.findActive(1, 20);
      expect(result.ads).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.pages).toBe(1);
    });
  });

  // ─── findOne ───────────────────────────────────────
  describe('findOne', () => {
    it('should throw NotFoundException if ad does not exist', async () => {
      mockPrisma.advertisement.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return ad if found', async () => {
      mockPrisma.advertisement.findUnique.mockResolvedValue({ id: 'ad-1', title: 'Test' });
      const result = await service.findOne('ad-1');
      expect(result.title).toBe('Test');
    });
  });

  // ─── update ────────────────────────────────────────
  describe('update', () => {
    it('should throw ForbiddenException if not owner and not admin', async () => {
      mockPrisma.advertisement.findUnique.mockResolvedValue({ id: 'ad-1', publisherId: 'pub-1' });

      await expect(
        service.update('ad-1', 'other-user', false, { title: 'New' } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow owner to update', async () => {
      mockPrisma.advertisement.findUnique.mockResolvedValue({ id: 'ad-1', publisherId: 'pub-1' });
      mockPrisma.advertisement.update.mockResolvedValue({ id: 'ad-1', title: 'Updated' });

      const result = await service.update('ad-1', 'pub-1', false, { title: 'Updated' } as any);
      expect(result.title).toBe('Updated');
    });

    it('should allow admin to update any ad', async () => {
      mockPrisma.advertisement.findUnique.mockResolvedValue({ id: 'ad-1', publisherId: 'pub-1' });
      mockPrisma.advertisement.update.mockResolvedValue({ id: 'ad-1', status: 'ACTIVE' });

      const result = await service.update('ad-1', 'admin-user', true, { status: 'ACTIVE' } as any);
      expect(result.status).toBe('ACTIVE');
    });
  });

  // ─── remove ────────────────────────────────────────
  describe('remove', () => {
    it('should throw ForbiddenException if not owner and not admin', async () => {
      mockPrisma.advertisement.findUnique.mockResolvedValue({ id: 'ad-1', publisherId: 'pub-1' });

      await expect(service.remove('ad-1', 'other-user', false)).rejects.toThrow(ForbiddenException);
    });

    it('should allow owner to delete', async () => {
      mockPrisma.advertisement.findUnique.mockResolvedValue({ id: 'ad-1', publisherId: 'pub-1' });
      mockPrisma.advertisement.delete.mockResolvedValue({ id: 'ad-1' });

      const result = await service.remove('ad-1', 'pub-1', false);
      expect(result.id).toBe('ad-1');
    });
  });

  // ─── admin operations ─────────────────────────────
  describe('approve', () => {
    it('should set status to ACTIVE', async () => {
      mockPrisma.advertisement.findUnique.mockResolvedValue({ id: 'ad-1' });
      mockPrisma.advertisement.update.mockResolvedValue({ id: 'ad-1', status: 'ACTIVE' });

      const result = await service.approve('ad-1');
      expect(result.status).toBe('ACTIVE');
    });
  });

  describe('reject', () => {
    it('should set status to REJECTED', async () => {
      mockPrisma.advertisement.findUnique.mockResolvedValue({ id: 'ad-1' });
      mockPrisma.advertisement.update.mockResolvedValue({ id: 'ad-1', status: 'REJECTED' });

      const result = await service.reject('ad-1');
      expect(result.status).toBe('REJECTED');
    });
  });

  describe('pause', () => {
    it('should set status to PAUSED', async () => {
      mockPrisma.advertisement.findUnique.mockResolvedValue({ id: 'ad-1' });
      mockPrisma.advertisement.update.mockResolvedValue({ id: 'ad-1', status: 'PAUSED' });

      const result = await service.pause('ad-1');
      expect(result.status).toBe('PAUSED');
    });
  });
});
