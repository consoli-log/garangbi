import {
  Equals,
  IsBoolean,
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(10)
  @Matches(/^[a-zA-Z0-9가-힣]+$/, {
    message: '닉네임에는 특수문자를 사용할 수 없습니다.',
  })
  nickname: string;

  @IsString()
  @MinLength(8)
  @MaxLength(16)
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message: '비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.',
  })
  password: string;

  @IsBoolean()
  @Equals(true, { message: '서비스 이용약관에 동의해야 합니다.' })
  termsAgreed: boolean;

  @IsBoolean()
  @Equals(true, { message: '개인정보 처리방침에 동의해야 합니다.' })
  privacyAgreed: boolean;
}
