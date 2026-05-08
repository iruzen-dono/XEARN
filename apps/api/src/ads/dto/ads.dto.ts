import {
  IsString,
  IsOptional,
  IsUrl,
  IsEnum,
  IsDateString,
  IsArray,
  IsNumber,
  MaxLength,
  MinLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Sanitize: trim + strip HTML tags to prevent XSS
const sanitize = (v: unknown) => (typeof v === 'string' ? v.trim().replace(/<[^>]*>/g, '') : v);

export enum AdStatusDto {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  EXPIRED = 'EXPIRED',
  REJECTED = 'REJECTED',
}

export enum AccountTierDto {
  NORMAL = 'NORMAL',
  PREMIUM = 'PREMIUM',
  VIP = 'VIP',
}

export class CreateAdDto {
  @ApiProperty({ example: 'Campagne sponsorisée saison 1' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  @Transform(({ value }) => sanitize(value))
  title!: string;

  @ApiPropertyOptional({ example: 'Campagne de lancement pour le marché local.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => sanitize(value))
  description?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/ad.jpg' })
  @IsOptional()
  @IsUrl()
  mediaUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.com/landing' })
  @IsOptional()
  @IsUrl()
  targetUrl?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ example: ['TG', 'CI'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetCountries?: string[];

  @ApiPropertyOptional({ enum: AccountTierDto, isArray: true, example: [AccountTierDto.NORMAL] })
  @IsOptional()
  @IsArray()
  @IsEnum(AccountTierDto, { each: true, message: 'Tier cible invalide (NORMAL, PREMIUM, VIP)' })
  targetTiers?: AccountTierDto[];

  @ApiPropertyOptional({ example: 250000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;
}

export class UpdateAdDto {
  @ApiPropertyOptional({ example: 'Campagne mise à jour' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  @Transform(({ value }) => sanitize(value))
  title?: string;

  @ApiPropertyOptional({ example: 'Description mise à jour' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => sanitize(value))
  description?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/ad-v2.jpg' })
  @IsOptional()
  @IsUrl()
  mediaUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.com/landing-v2' })
  @IsOptional()
  @IsUrl()
  targetUrl?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ enum: AdStatusDto, example: AdStatusDto.ACTIVE })
  @IsOptional()
  @IsEnum(AdStatusDto)
  status?: AdStatusDto;

  @ApiPropertyOptional({ example: ['TG', 'CI'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetCountries?: string[];

  @ApiPropertyOptional({ enum: AccountTierDto, isArray: true, example: [AccountTierDto.PREMIUM] })
  @IsOptional()
  @IsArray()
  @IsEnum(AccountTierDto, { each: true, message: 'Tier cible invalide (NORMAL, PREMIUM, VIP)' })
  targetTiers?: AccountTierDto[];

  @ApiPropertyOptional({ example: 250000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;
}
