import { IsNumber, IsString, IsEnum, Min, Max, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

const sanitize = (v: any) => (typeof v === 'string' ? v.trim().replace(/<[^>]*>/g, '') : v);

export enum WithdrawMethod {
  MOBILE_MONEY = 'MOBILE_MONEY',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export class WithdrawDto {
  @IsNumber({}, { message: 'Le montant doit être un nombre' })
  @Min(2000, { message: 'Le montant minimum de retrait est 2 000 FCFA' })
  @Max(5000000, { message: 'Le montant maximum de retrait est 5 000 000 FCFA' })
  amount: number;

  @IsEnum(WithdrawMethod, { message: 'Méthode de retrait invalide (MOBILE_MONEY ou BANK_TRANSFER)' })
  method: WithdrawMethod;

  @IsString()
  @MaxLength(100, { message: 'Les informations de compte ne peuvent pas dépasser 100 caractères' })
  @Transform(({ value }) => sanitize(value))
  accountInfo: string;
}
