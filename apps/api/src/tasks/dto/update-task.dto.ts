import {
  IsString,
  IsNumber,
  IsOptional,
  IsUrl,
  IsEnum,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskType, AccountTierDto } from './create-task.dto';
import type { AccountTier as SharedAccountTier, TaskType as SharedTaskType } from '@xearn/types';

const sanitize = (v: unknown) => (typeof v === 'string' ? v.trim().replace(/<[^>]*>/g, '') : v);

export class UpdateTaskDto {
  @ApiPropertyOptional({ example: 'Titre mis à jour' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Le titre ne peut pas être vide' })
  @MaxLength(200, { message: 'Le titre ne peut pas dépasser 200 caractères' })
  @Transform(({ value }) => sanitize(value))
  title?: string;

  @ApiPropertyOptional({ example: 'Description mise à jour' })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'La description ne peut pas dépasser 1000 caractères' })
  @Transform(({ value }) => sanitize(value))
  description?: string;

  @ApiPropertyOptional({ enum: TaskType, example: TaskType.CLICK_AD })
  @IsOptional()
  @IsEnum(TaskType, { message: 'Type de tâche invalide (VIDEO_AD, CLICK_AD, SURVEY, SPONSORED)' })
  type?: SharedTaskType;

  @ApiPropertyOptional({ example: 750 })
  @IsOptional()
  @IsNumber({}, { message: 'La récompense doit être un nombre' })
  @Min(1, { message: 'La récompense doit être au moins 1 FCFA' })
  @Max(100000, { message: 'La récompense ne peut pas dépasser 100 000 FCFA' })
  reward?: number;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/ad.jpg' })
  @IsOptional()
  @IsUrl({}, { message: 'URL média invalide' })
  mediaUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.com/landing-page' })
  @IsOptional()
  @IsUrl({}, { message: 'URL externe invalide' })
  externalUrl?: string;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000000)
  maxCompletions?: number;

  @ApiPropertyOptional({ enum: AccountTierDto, example: AccountTierDto.PREMIUM })
  @IsOptional()
  @IsEnum(AccountTierDto, { message: 'Tier requis invalide (NORMAL, PREMIUM, VIP)' })
  requiredTier?: SharedAccountTier;

  @ApiPropertyOptional({ example: 'ysense-signup' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => sanitize(value))
  slug?: string;

  @ApiPropertyOptional({ example: 'https://www.ysense.com/?rb=234640632' })
  @IsOptional()
  @IsUrl({}, { message: 'Lien de parrainage invalide' })
  referralLink?: string;

  @ApiPropertyOptional({ example: 'Instructions détaillées...' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  instructions?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  requiresCode?: boolean;
}
