import { Equals, IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Match } from '../../../common/decorators/match.decorator';

export class EmailSignupDto {
  @IsEmail({}, { message: '유효한 이메일 형식이 아닙니다.' })
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(30)
  nickname!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/, {
    message: '비밀번호는 대문자, 소문자, 숫자, 특수문자를 포함해 8자 이상이어야 합니다.',
  })
  password!: string;

  @Match('password', { message: '비밀번호가 일치하지 않습니다.' })
  passwordConfirm!: string;

  @Equals(true, { message: '서비스 이용 약관에 동의해 주세요.' })
  agreeTerms!: boolean;

  @Equals(true, { message: '개인정보 처리방침에 동의해 주세요.' })
  agreePrivacy!: boolean;
}
