import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum UpgradeTierEnum {
  PREMIUM = 'PREMIUM',
  VIP = 'VIP',
}

export class UpgradeTierDto {
  @ApiProperty({ enum: UpgradeTierEnum, example: UpgradeTierEnum.PREMIUM })
  @IsEnum(UpgradeTierEnum, { message: 'Tier invalide (PREMIUM ou VIP)' })
  tier: 'PREMIUM' | 'VIP';
}
