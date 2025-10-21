import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { CompleteSocialOnboardingDto } from '../auth/dto/complete-social-onboarding.dto';
import { LedgersService } from '../ledgers/ledgers.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgersService: LedgersService,
  ) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        mainLedgerId: true,
        createdAt: true,
        updatedAt: true,
        provider: true,
        password: true,
        onboardingCompleted: true,
        termsAgreedAt: true,
        privacyAgreedAt: true,
      },
    });

    if (!user) {
      return null;
    }

    const { password, ...rest } = user;

    return {
      ...rest,
      hasPassword: Boolean(password),
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('프로필을 변경할 수 없습니다.');
    }

    if (user.password) {
      if (!dto.currentPassword) {
        throw new UnauthorizedException('현재 비밀번호가 일치하지 않습니다.');
      }

      const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('현재 비밀번호가 일치하지 않습니다.');
      }
    }

    const trimmedNickname = dto.nickname.trim();

    if (user.nickname !== trimmedNickname) {
      const exists = await this.prisma.user.findUnique({
        where: { nickname: trimmedNickname },
      });

      if (exists) {
        throw new ConflictException('이미 사용 중인 닉네임입니다.');
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        nickname: trimmedNickname,
      },
    });

    return this.getMe(userId);
  }

  async updatePassword(userId: string, dto: UpdatePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.password) {
      throw new BadRequestException('비밀번호를 변경할 수 없습니다.');
    }

    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('현재 비밀번호가 일치하지 않습니다.');
    }

    const samePassword = await bcrypt.compare(dto.newPassword, user.password);
    if (samePassword) {
      throw new BadRequestException('새 비밀번호는 현재 비밀번호와 달라야 합니다.');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });
  }

  async verifyPassword(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        password: true,
      },
    });

    if (!user || !user.password) {
      throw new BadRequestException('비밀번호를 확인할 수 없습니다.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('현재 비밀번호가 일치하지 않습니다.');
    }

    return { success: true };
  }

  async deleteAccount(userId: string, dto: DeleteAccountDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        password: true,
        nickname: true,
      },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    if (user.password) {
      if (!dto.password) {
        throw new UnauthorizedException('현재 비밀번호가 필요합니다.');
      }

      const isValid = await bcrypt.compare(dto.password, user.password);
      if (!isValid) {
        throw new UnauthorizedException('현재 비밀번호가 일치하지 않습니다.');
      }
    }

    if (!dto.confirm) {
      throw new BadRequestException('탈퇴에 동의해야 합니다.');
    }

    const ownedLedgers = await this.prisma.ledger.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true },
    });

    for (const ledger of ownedLedgers) {
      await this.ledgersService.deleteLedger(userId, ledger.id, ledger.name);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.ledgerMember.deleteMany({ where: { userId } });
      await tx.ledgerInvitation.deleteMany({
        where: {
          OR: [{ invitedById: userId }, { email: user.email }],
        },
      });
      await tx.ledgerActivityLog.deleteMany({ where: { actorId: userId } });
      await tx.goalContribution.deleteMany({
        where: { transaction: { createdById: userId } },
      });
      await tx.transactionAttachment.deleteMany({
        where: { transaction: { createdById: userId } },
      });
      await tx.transactionTag.deleteMany({
        where: { transaction: { createdById: userId } },
      });
      await tx.transactionSplit.deleteMany({
        where: { transaction: { createdById: userId } },
      });
      await tx.transaction.deleteMany({ where: { createdById: userId } });
      await tx.recurringInstance.deleteMany({
        where: { rule: { createdById: userId } },
      });
      await tx.recurringRule.deleteMany({ where: { createdById: userId } });
      await tx.scheduledDigest.deleteMany({ where: { userId } });
      await tx.userNotificationSetting.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });

    if (dto.reason) {
      this.logger.log(`User ${user.email} deleted account. Reason: ${dto.reason}`);
    } else {
      this.logger.log(`User ${user.email} deleted account.`);
    }
  }

  async completeSocialOnboarding(userId: string, dto: CompleteSocialOnboardingDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    if (user.onboardingCompleted) {
      return { success: true };
    }

    if (user.password) {
      throw new BadRequestException('이미 비밀번호를 설정한 계정입니다.');
    }

    const trimmedNickname = dto.nickname.trim();

    if (user.nickname !== trimmedNickname) {
      const exists = await this.prisma.user.findUnique({
        where: { nickname: trimmedNickname },
        select: { id: true },
      });

      if (exists) {
        throw new ConflictException('이미 사용 중인 닉네임입니다.');
      }
    }

    const now = new Date();

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        nickname: trimmedNickname,
        termsAgreedAt: now,
        privacyAgreedAt: now,
        onboardingCompleted: true,
      },
    });

    return { success: true };
  }
}
