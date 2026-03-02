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

const sanitize = (v: unknown) => (typeof v === 'string' ? v.trim().replace(/<[^>]*>/g, '') : v);

export enum TaskType {
  VIDEO_AD = 'VIDEO_AD',
  CLICK_AD = 'CLICK_AD',
  SURVEY = 'SURVEY',
  SPONSORED = 'SPONSORED',
}

export enum AccountTierDto {
  NORMAL = 'NORMAL',
  PREMIUM = 'PREMIUM',
  VIP = 'VIP',
}

export class CreateTaskDto {
  @IsString()
  @MinLength(1, { message: 'Le titre ne peut pas être vide' })
  @MaxLength(200, { message: 'Le titre ne peut pas dépasser 200 caractères' })
  @Transform(({ value }) => sanitize(value))
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'La description ne peut pas dépasser 1000 caractères' })
  @Transform(({ value }) => sanitize(value))
  description?: string;

  @IsEnum(TaskType, { message: 'Type de tâche invalide (VIDEO_AD, CLICK_AD, SURVEY, SPONSORED)' })
  type: TaskType;

  @IsNumber({}, { message: 'La récompense doit être un nombre' })
  @Min(1, { message: 'La récompense doit être au moins 1 FCFA' })
  @Max(100000, { message: 'La récompense ne peut pas dépasser 100 000 FCFA' })
  reward: number;

  @IsOptional()
  @IsUrl({}, { message: 'URL média invalide' })
  mediaUrl?: string;

  @IsOptional()
  @IsUrl({}, { message: 'URL externe invalide' })
  externalUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000000)
  maxCompletions?: number;

  @IsOptional()
  @IsEnum(AccountTierDto, { message: 'Tier requis invalide (NORMAL, PREMIUM, VIP)' })
  requiredTier?: AccountTierDto;
}
