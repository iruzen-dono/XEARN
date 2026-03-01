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

// Sanitize: trim + strip HTML tags to prevent XSS
const sanitize = (v: any) => (typeof v === 'string' ? v.trim().replace(/<[^>]*>/g, '') : v);

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
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  @Transform(({ value }) => sanitize(value))
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => sanitize(value))
  description?: string;

  @IsOptional()
  @IsUrl()
  mediaUrl?: string;

  @IsOptional()
  @IsUrl()
  targetUrl?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetCountries?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(AccountTierDto, { each: true, message: 'Tier cible invalide (NORMAL, PREMIUM, VIP)' })
  targetTiers?: AccountTierDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;
}

export class UpdateAdDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  @Transform(({ value }) => sanitize(value))
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => sanitize(value))
  description?: string;

  @IsOptional()
  @IsUrl()
  mediaUrl?: string;

  @IsOptional()
  @IsUrl()
  targetUrl?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsEnum(AdStatusDto)
  status?: AdStatusDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetCountries?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(AccountTierDto, { each: true, message: 'Tier cible invalide (NORMAL, PREMIUM, VIP)' })
  targetTiers?: AccountTierDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;
}
