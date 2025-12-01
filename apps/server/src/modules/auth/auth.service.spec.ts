import { BadRequestException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountStatus } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

describe('AuthService', () => {
  const prisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    emailVerificationToken: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
  } as unknown as PrismaService;
  const mailService = {
    sendEmailVerification: jest.fn(),
  } as unknown as MailService;
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'auth.emailVerification.baseUrl') {
        return 'http://localhost:5173/verify-email';
      }
      if (key === 'auth.emailVerification.tokenTtlMinutes') {
        return 60;
      }
      return undefined;
    }),
  } as unknown as ConfigService;

  const service = new AuthService(prisma, mailService, configService);

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.emailVerificationToken.upsert as jest.Mock).mockResolvedValue(null);
    (prisma.emailVerificationToken.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.emailVerificationToken.update as jest.Mock).mockResolvedValue(null);
    (prisma.user.update as jest.Mock).mockResolvedValue(null);
    (mailService.sendEmailVerification as jest.Mock).mockResolvedValue(undefined);
  });

  it('이메일이 중복이면 Conflict 예외를 던진다', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({
      email: 'test@example.com',
      nickname: 'tester',
    });

    await expect(
      service.emailSignup({
        email: 'test@example.com',
        nickname: 'tester2',
        password: 'password123',
        passwordConfirm: 'password123',
        agreeTerms: true,
        agreePrivacy: true,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('중복이 없으면 PENDING 상태 사용자로 가입시킨다', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'user_1',
      email: 'new@example.com',
      nickname: 'newbie',
      status: AccountStatus.PENDING,
    });

    const result = await service.emailSignup({
      email: 'new@example.com',
      nickname: 'newbie',
      password: 'password123',
      passwordConfirm: 'password123',
      agreeTerms: true,
      agreePrivacy: true,
    });

    expect(prisma.user.create).toHaveBeenCalled();
    expect(result.status).toBe(AccountStatus.PENDING);
    expect(result.nextStep).toBe('VERIFY_EMAIL');
    expect(prisma.emailVerificationToken.upsert).toHaveBeenCalled();
    expect(mailService.sendEmailVerification).toHaveBeenCalled();
  });

  it('이메일이 이미 존재하면 valid=false를 반환한다', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user_1',
    });

    const result = await service.checkEmailAvailability('test@example.com');

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
      select: { id: true },
    });
    expect(result.valid).toBe(false);
  });

  it('이메일이 없으면 valid=true를 반환한다', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await service.checkEmailAvailability('unique@example.com');

    expect(result.valid).toBe(true);
  });

  it('이메일 인증 토큰이 유효하면 계정을 활성화한다', async () => {
    const rawToken = 'test-token';
    const hashedToken = createHash('sha256').update(rawToken).digest('hex');
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user_1',
      email: 'pending@example.com',
      status: AccountStatus.PENDING,
    });
    (prisma.emailVerificationToken.findUnique as jest.Mock).mockResolvedValue({
      userId: 'user_1',
      tokenHash: hashedToken,
      expiresAt: new Date(Date.now() + 1000 * 60),
      consumedAt: null,
    });

    const result = await service.verifyEmail({
      email: 'pending@example.com',
      token: rawToken,
    });

    expect(result.status).toBe(AccountStatus.ACTIVE);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('만료된 토큰이면 예외를 던진다', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user_1',
      email: 'pending@example.com',
      status: AccountStatus.PENDING,
    });
    (prisma.emailVerificationToken.findUnique as jest.Mock).mockResolvedValue({
      userId: 'user_1',
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() - 1000),
      consumedAt: null,
    });

    await expect(
      service.verifyEmail({
        email: 'pending@example.com',
        token: 'anything',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('존재하지 않는 사용자면 예외를 던진다', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.verifyEmail({
        email: 'unknown@example.com',
        token: 'token',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
