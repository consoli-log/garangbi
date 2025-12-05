import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword, verifyPassword } from '../../common/utils/password.util';
import { EmailSignupDto } from './dto/email-signup.dto';
import { AccountStatus } from '@prisma/client';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { NicknameCheckDto } from './dto/nickname-check.dto';
import { MailService } from '../mail/mail.service';
import { createHash, randomBytes } from 'crypto';
import type {
  EmailCheckResponseData,
  EmailSignupResponseData,
  LoginResponseData,
  NicknameCheckResponseData,
  VerifyEmailResponseData,
} from '@zzogaebook/types';
import { LoginDto } from './dto/login.dto';
import { signJwt } from '../../common/utils/jwt.util';

@Injectable()
export class AuthService {
  private readonly emailVerificationBaseUrl: string;
  private readonly emailVerificationTokenTtlMinutes: number;
  private readonly jwtSecret: string;
  private readonly jwtAccessTokenTtlSeconds: number;
  private readonly jwtRememberMeTokenTtlSeconds: number;
  private readonly logger = new Logger(AuthService.name);

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
    this.jwtSecret = this.configService.getOrThrow<string>('jwt.secret', { infer: true });
    const accessTokenTtlMinutes = this.configService.getOrThrow<number>(
      'jwt.accessTokenTtlMinutes',
      { infer: true },
    );
    const rememberMeTtlMinutes = this.configService.getOrThrow<number>(
      'jwt.rememberMeAccessTokenTtlMinutes',
      { infer: true },
    );
    this.jwtAccessTokenTtlSeconds = accessTokenTtlMinutes * 60;
    this.jwtRememberMeTokenTtlSeconds = rememberMeTtlMinutes * 60;
  }

  async emailSignup(dto: EmailSignupDto): Promise<EmailSignupResponseData> {
    const normalizedNickname = dto.nickname.trim();

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { nickname: normalizedNickname }],
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
        nickname: normalizedNickname,
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

    try {
      await this.issueVerificationToken(user.id, user.email);
    } catch (error) {
      await this.safeDeleteUser(user.id);
      this.logger.error('이메일 인증 메일 발송 실패로 신규 계정을 롤백했습니다.', error as Error);
      throw new InternalServerErrorException({
        code: 'ACC_EMAIL_SEND_FAILED',
        message: '인증 메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.',
      });
    }

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

  async checkNicknameAvailability(nickname: string): Promise<NicknameCheckResponseData> {
    const normalizedNickname = nickname.trim();

    const existing = await this.prisma.user.findUnique({
      where: {
        nickname: normalizedNickname,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      return {
        valid: false,
        message: '이미 사용 중인 닉네임입니다.',
      };
    }

    return {
      valid: true,
      message: '사용 가능한 닉네임입니다.',
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

  async login(dto: LoginDto): Promise<LoginResponseData> {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
      select: {
        id: true,
        email: true,
        nickname: true,
        passwordHash: true,
        status: true,
      },
    });

    if (!user) {
      this.throwInvalidLogin();
    }

    const isValidPassword = await verifyPassword(dto.password, user.passwordHash);
    if (!isValidPassword) {
      this.throwInvalidLogin();
    }

    if (user.status === AccountStatus.PENDING) {
      throw new BadRequestException({
        code: 'ACC_LOGIN_PENDING',
        message: '이메일 인증이 완료되지 않았습니다. 메일함을 확인해 주세요.',
        canResend: true,
      });
    }

    const rememberMe = Boolean(dto.rememberMe);
    const expiresIn = rememberMe
      ? this.jwtRememberMeTokenTtlSeconds
      : this.jwtAccessTokenTtlSeconds;

    const accessToken = signJwt({
      secret: this.jwtSecret,
      expiresInSeconds: expiresIn,
      payload: {
        sub: user.id,
        email: user.email,
        nickname: user.nickname,
      },
    });

    return {
      userId: user.id,
      email: user.email,
      nickname: user.nickname,
      status: user.status,
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      message: rememberMe
        ? '로그인되었습니다. 2주 동안 로그인 상태가 유지됩니다.'
        : '로그인되었습니다.',
    };
  }

  private throwInvalidLogin(): never {
    throw new BadRequestException({
      code: 'ACC_LOGIN_INVALID',
      message: '이메일 또는 비밀번호가 올바르지 않습니다.',
    });
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

  async resendEmailVerification(dto: ResendVerificationDto): Promise<VerifyEmailResponseData> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        status: true,
      },
    });

    if (!user) {
      throw new BadRequestException({
        code: 'ACC_RESEND_INVALID',
        message: '가입 정보를 찾을 수 없습니다. 이메일을 확인해주세요.',
      });
    }

    if (user.status === AccountStatus.ACTIVE) {
      throw new BadRequestException({
        code: 'ACC_ALREADY_VERIFIED',
        message: '이미 인증이 완료된 계정입니다. 로그인해주세요.',
      });
    }

    try {
      await this.issueVerificationToken(user.id, user.email);
    } catch (error) {
      this.logger.error('인증 메일 재발송 실패', error as Error);
      throw new InternalServerErrorException({
        code: 'ACC_EMAIL_SEND_FAILED',
        message: '인증 메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.',
      });
    }

    return {
      email: user.email,
      status: user.status,
      message: '인증 메일을 다시 보냈습니다. 메일함을 확인해주세요.',
    };
  }

  private buildVerificationUrl(email: string, token: string): string {
    const url = new URL(this.emailVerificationBaseUrl);
    url.searchParams.set('email', email);
    url.searchParams.set('token', token);
    return url.toString();
  }

  private async safeDeleteUser(userId: string) {
    try {
      await this.prisma.user.delete({ where: { id: userId } });
    } catch (error) {
      this.logger.error('메일 발송 실패 후 신규 계정 삭제 중 오류가 발생했습니다.', error as Error);
    }
  }
}
