import { IsBoolean, IsString, MinLength } from 'class-validator';

export class RespondInvitationDto {
  @IsString()
  @MinLength(1)
  token: string;

  @IsBoolean()
  accept: boolean;
}
