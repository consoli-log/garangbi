import {
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  @Matches(/^[a-zA-Z0-9가-힣]+$/, {
    message: '닉네임에는 특수문자를 사용할 수 없습니다.',
  })
  nickname: string;

  @IsString()
  @MinLength(1)
  currentPassword: string;
}
