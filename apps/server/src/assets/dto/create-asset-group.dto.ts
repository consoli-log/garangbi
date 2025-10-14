import { AssetGroupType } from '@prisma/client';
import { IsEnum, IsString, MinLength } from 'class-validator';

export class CreateAssetGroupDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEnum(AssetGroupType)
  type: AssetGroupType;
}
