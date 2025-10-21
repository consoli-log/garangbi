import {
  Equals,
  IsBoolean,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CompleteSocialOnboardingDto {
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(2)
  @MaxLength(10)
  @Matches(/^[a-zA-Z0-9가-힣]+$/, {
    message: '닉네임에는 특수문자를 사용할 수 없습니다.',
  })
  nickname: string;

  @IsBoolean()
  @Equals(true, { message: '서비스 이용약관에 동의해야 합니다.' })
  termsAgreed: boolean;

  @IsBoolean()
  @Equals(true, { message: '개인정보 처리방침에 동의해야 합니다.' })
  privacyAgreed: boolean;
}
