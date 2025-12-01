import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword } from '../../common/utils/password.util';
import { EmailSignupDto } from './dto/email-signup.dto';
import { AccountStatus } from '@prisma/client';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { MailService } from '../mail/mail.service';
import { createHash, randomBytes } from 'crypto';
import type {
  EmailCheckResponseData,
  EmailSignupResponseData,
  VerifyEmailResponseData,
} from '@zzogaebook/types';

@Injectable()
export class AuthService {
  private readonly emailVerificationBaseUrl: string;
  private readonly emailVerificationTokenTtlMinutes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {
    this.emailVerificationBaseUrl = this.configService.getOrThrow<string>(
      'auth.emailVerification.baseUrl',
      {
        infer: true,
      },
    );
    this.emailVerificationTokenTtlMinutes = this.configService.getOrThrow<number>(
      'auth.emailVerification.tokenTtlMinutes',
      {
        infer: true,
      },
    );
  }

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

    await this.issueVerificationToken(user.id, user.email);

    return {
      userId: user.id,
      email: user.email,
      nickname: user.nickname,
      status: user.status,
      nextStep: 'VERIFY_EMAIL',
      message: '가입 신청이 완료되었습니다. 이메일을 확인해 주세요.',
    };
  }

  async checkEmailAvailability(email: string): Promise<EmailCheckResponseData> {
    const existing = await this.prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      return {
        valid: false,
        message: '이미 사용 중인 이메일입니다.',
      };
    }

    return {
      valid: true,
      message: '사용 가능한 이메일입니다.',
    };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<VerifyEmailResponseData> {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
      select: {
        id: true,
        email: true,
        status: true,
      },
    });

    if (!user) {
      throw new BadRequestException({
        code: 'ACC_VERIFY_INVALID',
        message: '잘못된 인증 요청입니다.',
      });
    }

    if (user.status === AccountStatus.ACTIVE) {
      throw new BadRequestException({
        code: 'ACC_ALREADY_VERIFIED',
        message: '이미 인증이 완료된 계정입니다.',
      });
    }

    const verificationToken = await this.prisma.emailVerificationToken.findUnique({
      where: {
        userId: user.id,
      },
    });

    if (!verificationToken) {
      throw new BadRequestException({
        code: 'ACC_VERIFY_INVALID',
        message: '잘못된 인증 요청입니다.',
      });
    }

    if (verificationToken.consumedAt) {
      throw new BadRequestException({
        code: 'ACC_VERIFY_USED',
        message: '이미 사용된 인증 링크입니다.',
      });
    }

    if (verificationToken.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException({
        code: 'ACC_VERIFY_EXPIRED',
        message: '인증 링크가 만료되었습니다. 다시 발송해 주세요.',
      });
    }

    const hashedToken = this.hashVerificationToken(dto.token);
    if (verificationToken.tokenHash !== hashedToken) {
      throw new BadRequestException({
        code: 'ACC_VERIFY_INVALID',
        message: '잘못된 인증 요청입니다.',
      });
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          status: AccountStatus.ACTIVE,
          emailVerifiedAt: now,
        },
      }),
      this.prisma.emailVerificationToken.update({
        where: {
          userId: user.id,
        },
        data: {
          consumedAt: now,
        },
      }),
    ]);

    return {
      email: user.email,
      status: AccountStatus.ACTIVE,
      message: '계정이 활성화되었습니다. 로그인해 주세요.',
    };
  }

  private async issueVerificationToken(userId: string, email: string) {
    const rawToken = this.generateVerificationToken();
    const tokenHash = this.hashVerificationToken(rawToken);
    const expiresAt = this.getTokenExpiryDate();

    await this.prisma.emailVerificationToken.upsert({
      where: {
        userId,
      },
      update: {
        tokenHash,
        expiresAt,
        consumedAt: null,
      },
      create: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    const verificationUrl = this.buildVerificationUrl(email, rawToken);
    await this.mailService.sendEmailVerification({
      email,
      verificationUrl,
    });
  }

  private generateVerificationToken(): string {
    return randomBytes(32).toString('hex');
  }

  private hashVerificationToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getTokenExpiryDate(): Date {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.emailVerificationTokenTtlMinutes);
    return expiresAt;
  }

  private buildVerificationUrl(email: string, token: string): string {
    const url = new URL(this.emailVerificationBaseUrl);
    url.searchParams.set('email', email);
    url.searchParams.set('token', token);
    return url.toString();
  }
}
