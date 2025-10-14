import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateLedgerDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  currency: string;

  @IsInt()
  @Min(1)
  @Max(28)
  monthStartDay: number;
}
