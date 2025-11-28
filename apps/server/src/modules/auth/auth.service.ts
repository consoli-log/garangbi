import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword } from '../../common/utils/password.util';
import { EmailSignupDto } from './dto/email-signup.dto';
import { AccountStatus } from '@prisma/client';
import type { EmailSignupResponseData } from '@zzogaebook/types';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async emailSignup(dto: EmailSignupDto): Promise<EmailSignupResponseData> {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { nickname: dto.nickname }],
      },
      select: {
        email: true,
        nickname: true,
      },
    });

    if (existing) {
      const isEmailDuplicated = existing.email === dto.email;
      throw new ConflictException({
        code: isEmailDuplicated ? 'ACC_EMAIL_DUPLICATED' : 'ACC_NICKNAME_DUPLICATED',
        message: isEmailDuplicated ? '이미 사용 중인 이메일입니다.' : '이미 사용 중인 닉네임입니다.',
      });
    }

    const passwordHash = await hashPassword(dto.password);
    const agreedAt = new Date();

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        nickname: dto.nickname,
        passwordHash,
        status: AccountStatus.PENDING,
        termsAgreedAt: dto.agreeTerms ? agreedAt : null,
        privacyAgreedAt: dto.agreePrivacy ? agreedAt : null,
      },
      select: {
        id: true,
        email: true,
        nickname: true,
        status: true,
      },
    });

    return {
      userId: user.id,
      email: user.email,
      nickname: user.nickname,
      status: user.status,
      nextStep: 'VERIFY_EMAIL',
      message: '가입 신청이 완료되었습니다. 이메일을 확인해 주세요.',
    };
  }
}
