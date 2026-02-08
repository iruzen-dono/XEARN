import { IsString, IsNumber, IsOptional, IsUrl, IsEnum, Min, Max, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

const sanitize = (v: any) => (typeof v === 'string' ? v.trim().replace(/<[^>]*>/g, '') : v);

export enum TaskType {
  VIDEO_AD = 'VIDEO_AD',
  CLICK_AD = 'CLICK_AD',
  SURVEY = 'SURVEY',
  APP_INSTALL = 'APP_INSTALL',
  SOCIAL_SHARE = 'SOCIAL_SHARE',
}

export class CreateTaskDto {
  @IsString()
  @MaxLength(200, { message: 'Le titre ne peut pas dépasser 200 caractères' })
  @Transform(({ value }) => sanitize(value))
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'La description ne peut pas dépasser 1000 caractères' })
  @Transform(({ value }) => sanitize(value))
  description?: string;

  @IsEnum(TaskType, { message: 'Type de tâche invalide' })
  type: TaskType;

  @IsNumber({}, { message: 'La récompense doit être un nombre' })
  @Min(1, { message: 'La récompense doit être au moins 1 FCFA' })
  @Max(100000, { message: 'La récompense ne peut pas dépasser 100 000 FCFA' })
  reward: number;

  @IsOptional()
  @IsUrl({}, { message: 'URL invalide' })
  url?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000000)
  maxCompletions?: number;
}
