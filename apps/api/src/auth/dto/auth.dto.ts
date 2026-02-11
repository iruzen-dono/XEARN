import { IsEmail, IsOptional, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

// Sanitize helper: trim + strip HTML tags
const sanitize = (v: any) => (typeof v === 'string' ? v.trim().replace(/<[^>]*>/g, '') : v);

export class RegisterDto {
  @IsOptional()
  @IsEmail({}, { message: 'Adresse email invalide' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{8,15}$/, { message: 'Numéro de téléphone invalide' })
  @Transform(({ value }) => sanitize(value))
  phone?: string;

  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  @MaxLength(128, { message: 'Le mot de passe ne peut pas dépasser 128 caractères' })
  password: string;

  @IsString()
  @MinLength(1, { message: 'Le prénom est requis' })
  @MaxLength(50, { message: 'Le prénom ne peut pas dépasser 50 caractères' })
  @Transform(({ value }) => sanitize(value))
  firstName: string;

  @IsString()
  @MinLength(1, { message: 'Le nom est requis' })
  @MaxLength(50, { message: 'Le nom ne peut pas dépasser 50 caractères' })
  @Transform(({ value }) => sanitize(value))
  lastName: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => sanitize(value))
  referralCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  fingerprint?: string;
}

export class LoginDto {
  @IsOptional()
  @IsEmail({}, { message: 'Adresse email invalide' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{8,15}$/, { message: 'Numéro de téléphone invalide' })
  phone?: string;

  @IsString()
  @MinLength(1, { message: 'Le mot de passe est requis' })
  @MaxLength(128)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  fingerprint?: string;
}

export class RefreshTokenDto {
  @IsString()
  @MinLength(1)
  refreshToken: string;
}

export class ResendVerificationDto {
  @IsEmail({}, { message: 'Adresse email invalide' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  email: string;
}

export class GoogleAuthDto {
  @IsEmail({}, { message: 'Adresse email invalide' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  email: string;

  @IsString()
  @MinLength(1)
  googleId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Transform(({ value }) => sanitize(value))
  firstName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Transform(({ value }) => sanitize(value))
  lastName: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => sanitize(value))
  avatarUrl?: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Adresse email invalide' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(1, { message: 'Token requis' })
  token: string;

  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  @MaxLength(128, { message: 'Le mot de passe ne peut pas dépasser 128 caractères' })
  password: string;
}
