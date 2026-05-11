import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdDto, UpdateAdDto } from './dto/ads.dto';
import type { AccountTier, AdStatus } from '@xearn/types';

type AdvertisementRecord = {
  spent: unknown;
  budget?: unknown;
  status: AdStatus;
} & Record<string, unknown>;

@Injectable()
export class AdsService {
  constructor(private prisma: PrismaService) {}

  /** Create an advertisement (PARTNER or ADMIN only) */
  async create(publisherId: string, dto: CreateAdDto) {
    return this.prisma.advertisement.create({
      data: {
        publisherId,
        title: dto.title,
        description: dto.description,
        mediaUrl: dto.mediaUrl,
        targetUrl: dto.targetUrl,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        targetCountries: dto.targetCountries || [],
        targetTiers: dto.targetTiers || [],
        budget: dto.budget,
      },
    });
  }

  /** List active ads filtered by user tier and country */
  async findActive(page = 1, limit = 20, userTier?: AccountTier, userCountry?: string) {
    const take = Math.min(limit, 50);
    const skip = (page - 1) * take;

    const andConditions: Record<string, unknown>[] = [];
    const where: Record<string, unknown> = {
      status: 'ACTIVE' as const,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    };

    // Filter by tier at DB level using Prisma array operators
    if (userTier) {
      andConditions.push({
        OR: [{ targetTiers: { isEmpty: true } }, { targetTiers: { has: userTier } }],
      });
    }

    // Filter by country at DB level
    if (userCountry) {
      andConditions.push({
        OR: [{ targetCountries: { isEmpty: true } }, { targetCountries: { has: userCountry } }],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const [ads, total] = await Promise.all([
      this.prisma.advertisement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.advertisement.count({ where }),
    ]);

    // H6 fix: Filter out over-budget ads and adjust pagination counts accordingly
    const filtered = ads.filter(
      (ad: AdvertisementRecord) => !ad.budget || Number(ad.spent) < Number(ad.budget),
    );
    const budgetExhaustedCount = ads.length - filtered.length;
    const adjustedTotal = Math.max(0, total - budgetExhaustedCount);

    return { ads: filtered, total: adjustedTotal, page, pages: Math.ceil(adjustedTotal / take) };
  }

  /** List ads by publisher */
  async findByPublisher(publisherId: string, page = 1) {
    const take = 20;
    const skip = (page - 1) * take;

    // M10 fix: Use Promise.all instead of $transaction for read-only queries
    const [ads, total] = await Promise.all([
      this.prisma.advertisement.findMany({
        where: { publisherId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.advertisement.count({ where: { publisherId } }),
    ]);

    return { ads, total, page, pages: Math.ceil(total / take) };
  }

  /** Get a single ad */
  async findOne(id: string) {
    const ad = await this.prisma.advertisement.findUnique({ where: { id } });
    if (!ad) throw new NotFoundException('Publicité introuvable');
    return ad;
  }

  /** Update an ad (only the publisher or admin can do this) */
  async update(id: string, userId: string, isAdmin: boolean, dto: UpdateAdDto) {
    const ad = await this.findOne(id);

    if (ad.publisherId !== userId && !isAdmin) {
      throw new ForbiddenException('Vous ne pouvez modifier que vos propres publicités');
    }

    // Non-admin publishers cannot change status directly
    const { status: _status, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest };
    if (dto.expiresAt) data.expiresAt = new Date(dto.expiresAt);
    if (dto.targetCountries !== undefined) data.targetCountries = dto.targetCountries;
    if (dto.targetTiers !== undefined) data.targetTiers = dto.targetTiers;
    if (dto.budget !== undefined) data.budget = dto.budget;
    if (isAdmin && dto.status) data.status = dto.status;

    return this.prisma.advertisement.update({ where: { id }, data });
  }

  /** Delete an ad (publisher or admin) */
  async remove(id: string, userId: string, isAdmin: boolean) {
    const ad = await this.findOne(id);

    if (ad.publisherId !== userId && !isAdmin) {
      throw new ForbiddenException('Vous ne pouvez supprimer que vos propres publicités');
    }

    return this.prisma.advertisement.delete({ where: { id } });
  }

  /** Admin: list all ads with pagination */
  async adminFindAll(page = 1, status?: AdStatus) {
    const take = 20;
    const skip = (page - 1) * take;
    const where: Record<string, unknown> = status ? { status } : {};

    const [ads, total] = await Promise.all([
      this.prisma.advertisement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.advertisement.count({ where }),
    ]);

    return { ads, total, page, pages: Math.ceil(total / take) };
  }

  /** Admin: approve (set ACTIVE) */
  async approve(id: string) {
    await this.findOne(id);
    return this.prisma.advertisement.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
  }

  /** Admin: reject */
  async reject(id: string) {
    await this.findOne(id);
    return this.prisma.advertisement.update({
      where: { id },
      data: { status: 'REJECTED' },
    });
  }

  /** Admin: pause */
  async pause(id: string) {
    await this.findOne(id);
    return this.prisma.advertisement.update({
      where: { id },
      data: { status: 'PAUSED' },
    });
  }

  /** Get publisher stats for their ads */
  async getPublisherStats(publisherId: string) {
    const ads = await this.prisma.advertisement.findMany({
      where: { publisherId },
    });

    const totalAds = ads.length;
    const activeAds = ads.filter((a: AdvertisementRecord) => a.status === 'ACTIVE').length;
    const totalSpent = ads.reduce(
      (sum: number, a: AdvertisementRecord) => sum + Number(a.spent),
      0,
    );
    const totalBudget = ads.reduce(
      (sum: number, a: AdvertisementRecord) => sum + (a.budget ? Number(a.budget) : 0),
      0,
    );

    return {
      totalAds,
      activeAds,
      totalSpent: totalSpent.toFixed(2),
      totalBudget: totalBudget.toFixed(2),
      ads: ads.map((ad: AdvertisementRecord) => ({
        ...ad,
        spent: Number(ad.spent).toFixed(2),
        budget: ad.budget ? Number(ad.budget).toFixed(2) : null,
      })),
    };
  }
}
