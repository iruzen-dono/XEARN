import { IsEnum } from 'class-validator';

export enum UpgradeTierEnum {
  PREMIUM = 'PREMIUM',
  VIP = 'VIP',
}

export class UpgradeTierDto {
  @IsEnum(UpgradeTierEnum, { message: 'Tier invalide (PREMIUM ou VIP)' })
  tier: 'PREMIUM' | 'VIP';
}
