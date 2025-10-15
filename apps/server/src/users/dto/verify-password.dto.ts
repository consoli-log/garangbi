import { IsString, MinLength } from 'class-validator';

export class VerifyPasswordDto {
  @IsString()
  @MinLength(1, { message: '비밀번호를 입력해주세요.' })
  password: string;
}
