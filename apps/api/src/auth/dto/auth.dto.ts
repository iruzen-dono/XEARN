import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Sanitize helper: trim + strip HTML tags
const sanitize = (v: unknown) => (typeof v === 'string' ? v.trim().replace(/<[^>]*>/g, '') : v);

export class RegisterDto {
  @ApiPropertyOptional({ example: 'user@example.com', description: 'Adresse email de connexion' })
  @IsOptional()
  @IsEmail({}, { message: 'Adresse email invalide' })
  // MAJEUR FIX #7: Strict email validation with regex
  @Matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
    message: 'Format email invalide',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  email?: string;

  @ApiPropertyOptional({
    example: '+22890123456',
    description: 'Numéro de téléphone international',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{8,15}$/, { message: 'Numéro de téléphone invalide' })
  @Transform(({ value }) => sanitize(value))
  phone?: string;

  @ApiProperty({ example: 'Str0ngPassw0rd!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @MaxLength(128, { message: 'Le mot de passe ne peut pas dépasser 128 caractères' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message: 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre',
  })
  password: string;

  @ApiProperty({ example: 'Jean' })
  @IsString()
  @MinLength(1, { message: 'Le prénom est requis' })
  @MaxLength(50, { message: 'Le prénom ne peut pas dépasser 50 caractères' })
  @Transform(({ value }) => sanitize(value))
  firstName: string;

  @ApiProperty({ example: 'Kossi' })
  @IsString()
  @MinLength(1, { message: 'Le nom est requis' })
  @MaxLength(50, { message: 'Le nom ne peut pas dépasser 50 caractères' })
  @Transform(({ value }) => sanitize(value))
  lastName: string;

  @ApiPropertyOptional({ example: 'REF12345' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => sanitize(value))
  referralCode?: string;

  @ApiPropertyOptional({ example: 'browser-fingerprint' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  fingerprint?: string;
}

export class LoginDto {
  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Adresse email invalide' })
  // MAJEUR FIX #7: Strict email validation with regex
  @Matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
    message: 'Format email invalide',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  email?: string;

  @ApiPropertyOptional({ example: '+22890123456' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{8,15}$/, { message: 'Numéro de téléphone invalide' })
  @Transform(({ value }) => sanitize(value))
  phone?: string;

  @ApiProperty({ example: 'Str0ngPassw0rd!', minLength: 1 })
  @IsString()
  @MinLength(1, { message: 'Le mot de passe est requis' })
  @MaxLength(128)
  password: string;

  @ApiPropertyOptional({ example: 'browser-fingerprint' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  fingerprint?: string;
}

export class RefreshTokenDto {
  @ApiPropertyOptional({ example: 'refresh-token-value' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  refreshToken?: string;
}

export class ResendVerificationDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Adresse email invalide' })
  // MAJEUR FIX #7: Strict email validation with regex
  @Matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
    message: 'Format email invalide',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  email: string;
}

export class GoogleAuthDto {
  @ApiProperty({ example: 'google-id-token' })
  @IsString({ message: 'idToken Google requis' })
  @MinLength(1)
  idToken: string;

  @ApiPropertyOptional({ example: 'REF12345' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => sanitize(value))
  referralCode?: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Adresse email invalide' })
  // MAJEUR FIX #7: Strict email validation with regex
  @Matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
    message: 'Format email invalide',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'reset-token' })
  @IsString()
  @MinLength(1, { message: 'Token requis' })
  token: string;

  @ApiProperty({ example: 'Str0ngNewPassw0rd!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @MaxLength(128, { message: 'Le mot de passe ne peut pas dépasser 128 caractères' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message: 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre',
  })
  password: string;
}
