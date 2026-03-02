import {
  IsNumber,
  IsString,
  IsEnum,
  Min,
  Max,
  MaxLength,
  Matches,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

const sanitize = (v: unknown) => (typeof v === 'string' ? v.trim().replace(/<[^>]*>/g, '') : v);

// Méthodes de retrait mobile money (nécessitent un numéro de téléphone)
const MOBILE_MONEY_METHODS = ['MTN_MOMO', 'FLOOZ', 'TMONEY', 'ORANGE_MONEY'];

export enum WithdrawMethod {
  MTN_MOMO = 'MTN_MOMO',
  FLOOZ = 'FLOOZ',
  TMONEY = 'TMONEY',
  ORANGE_MONEY = 'ORANGE_MONEY',
  VISA = 'VISA',
  MASTERCARD = 'MASTERCARD',
  PAYPAL = 'PAYPAL',
}

export class WithdrawDto {
  @IsNumber({}, { message: 'Le montant doit être un nombre' })
  @Min(2000, { message: 'Le montant minimum de retrait est 2 000 FCFA' })
  @Max(5000000, { message: 'Le montant maximum de retrait est 5 000 000 FCFA' })
  amount: number;

  @IsEnum(WithdrawMethod, {
    message:
      'Méthode de retrait invalide (MTN_MOMO, FLOOZ, TMONEY, ORANGE_MONEY, VISA, MASTERCARD, PAYPAL)',
  })
  method: WithdrawMethod;

  @IsString()
  @MaxLength(100, { message: 'Les informations de compte ne peuvent pas dépasser 100 caractères' })
  @Transform(({ value }) => sanitize(value))
  @ValidateIf((o) => MOBILE_MONEY_METHODS.includes(o.method))
  @Matches(/^\+?(228|229|225|233|234|237|221|223|226|227|235|241|242|243)\s?\d{7,9}$/, {
    message:
      'Numéro de téléphone invalide. Format attendu : +228XXXXXXXX (Togo), +229XXXXXXXX (Bénin), +225XXXXXXXXXX (CI), etc.',
  })
  accountInfo: string;
}
