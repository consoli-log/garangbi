import { Equals, IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class DeleteAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsBoolean()
  @Equals(true, { message: '탈퇴에 동의해야 합니다.' })
  confirm: boolean;
}
