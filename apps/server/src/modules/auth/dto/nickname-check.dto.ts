import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class NicknameCheckDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(30)
  nickname!: string;
}
