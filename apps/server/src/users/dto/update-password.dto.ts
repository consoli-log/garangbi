import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(16)
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message: '비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.',
  })
  newPassword: string;
}
