import { PartialType } from '@nestjs/mapped-types';
import { CreateAssetDto } from './create-asset.dto';
import { IsInt, IsOptional } from 'class-validator';

export class UpdateAssetDto extends PartialType(CreateAssetDto) {
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
