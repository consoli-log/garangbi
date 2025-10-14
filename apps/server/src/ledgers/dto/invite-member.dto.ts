import { LedgerMemberRole } from '@prisma/client';
import { IsEmail, IsEnum } from 'class-validator';

export class InviteMemberDto {
  @IsEmail()
  email: string;

  @IsEnum(LedgerMemberRole)
  role: LedgerMemberRole;
}
