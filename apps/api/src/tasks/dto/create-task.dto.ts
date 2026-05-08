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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  @ApiProperty({ example: 'Visionner une publicité sponsorisée' })
  @IsString()
  @MinLength(1, { message: 'Le titre ne peut pas être vide' })
  @MaxLength(200, { message: 'Le titre ne peut pas dépasser 200 caractères' })
  @Transform(({ value }) => sanitize(value))
  title: string;

  @ApiPropertyOptional({ example: 'Regardez la publicité jusqu’à la fin pour valider la tâche.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'La description ne peut pas dépasser 1000 caractères' })
  @Transform(({ value }) => sanitize(value))
  description?: string;

  @ApiProperty({ enum: TaskType, example: TaskType.VIDEO_AD })
  @IsEnum(TaskType, { message: 'Type de tâche invalide (VIDEO_AD, CLICK_AD, SURVEY, SPONSORED)' })
  type: TaskType;

  @ApiProperty({ example: 500 })
  @IsNumber({}, { message: 'La récompense doit être un nombre' })
  @Min(1, { message: 'La récompense doit être au moins 1 FCFA' })
  @Max(100000, { message: 'La récompense ne peut pas dépasser 100 000 FCFA' })
  reward: number;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/ad.jpg' })
  @IsOptional()
  @IsUrl({}, { message: 'URL média invalide' })
  mediaUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.com/landing-page' })
  @IsOptional()
  @IsUrl({}, { message: 'URL externe invalide' })
  externalUrl?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000000)
  maxCompletions?: number;

  @ApiPropertyOptional({ enum: AccountTierDto, example: AccountTierDto.NORMAL })
  @IsOptional()
  @IsEnum(AccountTierDto, { message: 'Tier requis invalide (NORMAL, PREMIUM, VIP)' })
  requiredTier?: AccountTierDto;
}
