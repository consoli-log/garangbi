import { AssetType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateAssetDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEnum(AssetType)
  type: AssetType;

  @IsString()
  groupId: string;

  @IsInt()
  initialAmount: number;

  @IsBoolean()
  includeInNetWorth: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  billingDay?: number;

  @IsOptional()
  @IsInt()
  upcomingPaymentAmount?: number;
}
