import { ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountStatus } from '@prisma/client';

describe('AuthService', () => {
  const prisma = {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  } as unknown as PrismaService;

  const service = new AuthService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw conflict when duplicated email exists', async () => {
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

  it('should create pending user', async () => {
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
});
