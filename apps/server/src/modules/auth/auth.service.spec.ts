import { ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountStatus } from '@prisma/client';

describe('AuthService', () => {
  const prisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  } as unknown as PrismaService;

  const service = new AuthService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
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
});
