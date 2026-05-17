import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CompleteTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  verificationCode?: string;
}
