import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { TransactionStatus, TransactionType } from '@prisma/client';
import { Type } from 'class-transformer';

export class TransactionSplitDto {
  @IsUUID()
  categoryId: string;

  @IsInt()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  memo?: string;
}

export class TransactionAttachmentDto {
  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string | null;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsInt()
  @Min(0)
  size: number;
}

export class CreateTransactionDto {
  @IsEnum(TransactionType)
  type: TransactionType;

  @IsInt()
  @Min(1)
  amount: number;

  @IsDateString()
  transactionDate: string;

  @IsUUID('all')
  assetId: string;

  @IsOptional()
  @IsUUID()
  relatedAssetId?: string | null;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsUUID()
  recurringRuleId?: string | null;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  memo?: string | null;

  @IsOptional()
  @IsString()
  note?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => TransactionSplitDto)
  splits?: TransactionSplitDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => TransactionAttachmentDto)
  attachments?: TransactionAttachmentDto[];
}
