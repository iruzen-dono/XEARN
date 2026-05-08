import { IsOptional, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

const sanitize = (v: unknown) => (typeof v === 'string' ? v.trim().replace(/<[^>]*>/g, '') : v);

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Jean' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Le prénom est requis' })
  @MaxLength(50, { message: 'Le prénom ne peut pas dépasser 50 caractères' })
  @Transform(({ value }) => sanitize(value))
  firstName?: string;

  @ApiPropertyOptional({ example: 'Kossi' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Le nom est requis' })
  @MaxLength(50, { message: 'Le nom ne peut pas dépasser 50 caractères' })
  @Transform(({ value }) => sanitize(value))
  lastName?: string;

  @ApiPropertyOptional({ example: '+22890123456' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{8,15}$/, { message: 'Numéro de téléphone invalide' })
  @Transform(({ value }) => sanitize(value))
  phone?: string;
}

export class ChangePasswordDto {
  @ApiPropertyOptional({ example: 'CurrentPassw0rd!' })
  @IsString()
  @MinLength(1, { message: 'Mot de passe actuel requis' })
  currentPassword: string;

  @ApiPropertyOptional({ example: 'N3wStr0ngPassw0rd!' })
  @IsString()
  @MinLength(8, { message: 'Le nouveau mot de passe doit contenir au moins 8 caractères' })
  @MaxLength(128, { message: 'Le mot de passe ne peut pas dépasser 128 caractères' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message: 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre',
  })
  newPassword: string;
}
