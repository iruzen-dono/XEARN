import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdDto, UpdateAdDto } from './dto/ads.dto';

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
        targetTiers: (dto.targetTiers as any) || [],
        budget: dto.budget,
      },
    });
  }

  /** List active ads filtered by user tier and country */
  async findActive(page = 1, limit = 20, userTier?: string, userCountry?: string) {
    const take = Math.min(limit, 50);
    const skip = (page - 1) * take;

    const baseWhere: any = {
      status: 'ACTIVE',
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    };

    const [allAds, total] = await this.prisma.$transaction([
      this.prisma.advertisement.findMany({
        where: baseWhere,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.advertisement.count({ where: baseWhere }),
    ]);

    // Filter by targeting in-memory (Prisma doesn't support array-contains-any natively for enums)
    let filtered = allAds;
    if (userTier) {
      filtered = filtered.filter((ad) =>
        ad.targetTiers.length === 0 || ad.targetTiers.includes(userTier as any),
      );
    }
    if (userCountry) {
      filtered = filtered.filter((ad) =>
        ad.targetCountries.length === 0 || ad.targetCountries.includes(userCountry),
      );
    }

    // Also filter ads that have exceeded their budget
    filtered = filtered.filter((ad) =>
      !ad.budget || Number(ad.spent) < Number(ad.budget),
    );

    const paginated = filtered.slice(skip, skip + take);
    return { ads: paginated, total: filtered.length, page, pages: Math.ceil(filtered.length / take) };
  }

  /** List ads by publisher */
  async findByPublisher(publisherId: string, page = 1) {
    const take = 20;
    const skip = (page - 1) * take;

    const [ads, total] = await this.prisma.$transaction([
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
    const { status, ...rest } = dto;
    const data: any = { ...rest };
    if (dto.expiresAt) data.expiresAt = new Date(dto.expiresAt);
    if (dto.targetCountries !== undefined) data.targetCountries = dto.targetCountries;
    if (dto.targetTiers !== undefined) data.targetTiers = dto.targetTiers;
    if (dto.budget !== undefined) data.budget = dto.budget;
    if (isAdmin && status) data.status = status;

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
  async adminFindAll(page = 1, status?: string) {
    const take = 20;
    const skip = (page - 1) * take;
    const where = status ? { status: status as any } : {};

    const [ads, total] = await this.prisma.$transaction([
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
}
