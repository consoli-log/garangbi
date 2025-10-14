import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  LedgerMemberRole,
  InvitationStatus,
  AssetGroupType,
  CategoryType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLedgerDto } from './dto/create-ledger.dto';
import { UpdateLedgerDto } from './dto/update-ledger.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { EmailService } from '../auth/email.service';
import { randomBytes } from 'crypto';

@Injectable()
export class LedgersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async listForUser(userId: string) {
    const memberships = await this.prisma.ledgerMember.findMany({
      where: {
        userId,
      },
      include: {
        ledger: {
          include: {
            members: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mainLedgerId: true },
    });

    return memberships.map((membership) => ({
      id: membership.ledger.id,
      name: membership.ledger.name,
      description: membership.ledger.description,
      currency: membership.ledger.currency,
      monthStartDay: membership.ledger.monthStartDay,
      role: membership.role,
      memberCount: membership.ledger.members.length,
      isMain: user?.mainLedgerId === membership.ledger.id,
      createdAt: membership.ledger.createdAt,
      updatedAt: membership.ledger.updatedAt,
    }));
  }

  async createLedger(userId: string, dto: CreateLedgerDto) {
    const data: Prisma.LedgerCreateInput = {
      name: dto.name,
      description: dto.description ?? null,
      currency: dto.currency,
      monthStartDay: dto.monthStartDay,
      owner: {
        connect: { id: userId },
      },
      members: {
        create: {
          user: {
            connect: { id: userId },
          },
          role: LedgerMemberRole.OWNER,
        },
      },
    };

    const result = await this.prisma.$transaction(async (tx) => {
      const ledger = await tx.ledger.create({
        data,
      });

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { mainLedgerId: true },
      });

      if (!user?.mainLedgerId) {
        await tx.user.update({
          where: { id: userId },
          data: { mainLedgerId: ledger.id },
        });
      }

      const defaultAssetGroups = [
        { name: '현금', type: AssetGroupType.ASSET, sortOrder: 0 },
        { name: '은행', type: AssetGroupType.ASSET, sortOrder: 1 },
        { name: '신용카드', type: AssetGroupType.LIABILITY, sortOrder: 2 },
      ];

      await tx.assetGroup.createMany({
        data: defaultAssetGroups.map((group) => ({
          ledgerId: ledger.id,
          name: group.name,
          type: group.type,
          sortOrder: group.sortOrder,
        })),
      });

      const defaultCategories = [
        { name: '급여', type: CategoryType.INCOME, sortOrder: 0 },
        { name: '기타수입', type: CategoryType.INCOME, sortOrder: 1 },
        { name: '식비', type: CategoryType.EXPENSE, sortOrder: 0 },
        { name: '생활비', type: CategoryType.EXPENSE, sortOrder: 1 },
        { name: '교통/차량', type: CategoryType.EXPENSE, sortOrder: 2 },
        { name: '문화/여가', type: CategoryType.EXPENSE, sortOrder: 3 },
      ];

      await tx.category.createMany({
        data: defaultCategories.map((category) => ({
          ledgerId: ledger.id,
          name: category.name,
          type: category.type,
          sortOrder: category.sortOrder,
        })),
      });

      return ledger;
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mainLedgerId: true },
    });

    return {
      id: result.id,
      name: result.name,
      description: result.description,
      currency: result.currency,
      monthStartDay: result.monthStartDay,
      memberCount: 1,
      role: LedgerMemberRole.OWNER,
      isMain: user?.mainLedgerId === result.id,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  async updateLedger(userId: string, ledgerId: string, dto: UpdateLedgerDto) {
    await this.ensureOwner(userId, ledgerId);

    const ledger = await this.prisma.ledger.update({
      where: { id: ledgerId },
      data: {
        name: dto.name,
        description: dto.description,
        currency: dto.currency,
        monthStartDay: dto.monthStartDay,
      },
      include: {
        members: true,
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mainLedgerId: true },
    });

    return {
      id: ledger.id,
      name: ledger.name,
      description: ledger.description,
      currency: ledger.currency,
      monthStartDay: ledger.monthStartDay,
      memberCount: ledger.members.length,
      role: LedgerMemberRole.OWNER,
      isMain: user?.mainLedgerId === ledger.id,
      createdAt: ledger.createdAt,
      updatedAt: ledger.updatedAt,
    };
  }

  async deleteLedger(userId: string, ledgerId: string, confirmationName: string) {
    const ledger = await this.ensureOwner(userId, ledgerId);

    if (ledger.name !== confirmationName) {
      throw new BadRequestException('가계부 이름이 일치하지 않습니다.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.ledgerInvitation.deleteMany({
        where: { ledgerId },
      });
      await tx.ledgerMember.deleteMany({
        where: { ledgerId },
      });
      await tx.asset.deleteMany({
        where: { ledgerId },
      });
      await tx.assetGroup.deleteMany({
        where: { ledgerId },
      });
      await tx.category.deleteMany({
        where: { ledgerId },
      });
      await tx.ledger.delete({
        where: { id: ledgerId },
      });

      const usersWithMainLedger = await tx.user.findMany({
        where: { mainLedgerId: ledgerId },
        select: { id: true },
      });

      for (const user of usersWithMainLedger) {
        await tx.user.update({
          where: { id: user.id },
          data: { mainLedgerId: null },
        });
      }
    });
  }

  async setMainLedger(userId: string, ledgerId: string) {
    const membership = await this.prisma.ledgerMember.findFirst({
      where: { ledgerId, userId },
    });

    if (!membership) {
      throw new ForbiddenException('해당 가계부에 대한 접근 권한이 없습니다.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { mainLedgerId: ledgerId },
    });
  }

  async listInvitationsForUser(email: string) {
    const now = new Date();
    return this.prisma.ledgerInvitation.findMany({
      where: {
        email,
        status: InvitationStatus.PENDING,
        expiresAt: {
          gt: now,
        },
      },
      include: {
        ledger: true,
        invitedBy: {
          select: {
            nickname: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async inviteMember(userId: string, ledgerId: string, dto: InviteMemberDto) {
    await this.ensureOwnerOrEditor(userId, ledgerId);

    const existingMembership = await this.prisma.ledgerMember.findFirst({
      where: {
        ledgerId,
        user: {
          email: dto.email,
        },
      },
    });

    if (existingMembership) {
      throw new BadRequestException('이미 가계부에 참여 중인 사용자입니다.');
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await this.prisma.ledgerInvitation.create({
      data: {
        ledgerId,
        email: dto.email,
        role: dto.role,
        token,
        expiresAt,
        invitedById: userId,
      },
      include: {
        invitedBy: {
          select: { nickname: true, email: true },
        },
        ledger: {
          select: { name: true },
        },
      },
    });

    await this.emailService.sendLedgerInvitationEmail(
      invitation.email,
      invitation.invitedBy.nickname ?? invitation.invitedBy.email,
      invitation.ledger.name,
      token,
    );

    return invitation;
  }

  async respondToInvitation(userId: string, token: string, accept: boolean) {
    const invitation = await this.prisma.ledgerInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException('유효하지 않은 초대입니다.');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('이미 처리된 초대입니다.');
    }

    if (invitation.expiresAt < new Date()) {
      await this.prisma.ledgerInvitation.update({
        where: { token },
        data: {
          status: InvitationStatus.EXPIRED,
          respondedAt: new Date(),
        },
      });
      throw new BadRequestException('초대가 만료되었습니다.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.email !== invitation.email) {
      throw new ForbiddenException('이 초대를 수락할 권한이 없습니다.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.ledgerInvitation.update({
        where: { token },
        data: {
          status: accept ? InvitationStatus.ACCEPTED : InvitationStatus.DECLINED,
          respondedAt: new Date(),
        },
      });

      if (!accept) {
        return;
      }

      const membershipExists = await tx.ledgerMember.findFirst({
        where: { ledgerId: invitation.ledgerId, userId },
      });

      if (!membershipExists) {
        await tx.ledgerMember.create({
          data: {
            ledgerId: invitation.ledgerId,
            userId,
            role: invitation.role === LedgerMemberRole.OWNER ? LedgerMemberRole.EDITOR : invitation.role,
          },
        });
      }

      const userRecord = await tx.user.findUnique({
        where: { id: userId },
        select: { mainLedgerId: true },
      });

      if (!userRecord?.mainLedgerId) {
        await tx.user.update({
          where: { id: userId },
          data: { mainLedgerId: invitation.ledgerId },
        });
      }
    });
  }

  async revokeInvitation(userId: string, invitationId: string) {
    const invitation = await this.prisma.ledgerInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('초대를 찾을 수 없습니다.');
    }

    await this.ensureOwnerOrEditor(userId, invitation.ledgerId);

    return this.prisma.ledgerInvitation.delete({
      where: { id: invitationId },
    });
  }

  private async ensureOwner(userId: string, ledgerId: string) {
    const membership = await this.prisma.ledgerMember.findFirst({
      where: { ledgerId, userId },
      include: {
        ledger: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException('해당 가계부에 대한 접근 권한이 없습니다.');
    }

    if (membership.role !== LedgerMemberRole.OWNER) {
      throw new ForbiddenException('가계부 소유자만 수행할 수 있는 작업입니다.');
    }

    return membership.ledger;
  }

  private async ensureOwnerOrEditor(userId: string, ledgerId: string) {
    const membership = await this.prisma.ledgerMember.findFirst({
      where: { ledgerId, userId },
      include: { ledger: true },
    });

    if (!membership) {
      throw new ForbiddenException('해당 가계부에 대한 접근 권한이 없습니다.');
    }

    if (
      membership.role !== LedgerMemberRole.OWNER &&
      membership.role !== LedgerMemberRole.EDITOR
    ) {
      throw new ForbiddenException('권한이 부족합니다.');
    }

    return membership.ledger;
  }
}
