import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssetType,
  LedgerMemberRole,
  AssetGroupType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetGroupDto } from './dto/create-asset-group.dto';
import { UpdateAssetGroupDto } from './dto/update-asset-group.dto';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { ReorderItemsDto } from './dto/reorder-items.dto';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async listGroups(userId: string, ledgerId: string) {
    await this.ensureMember(userId, ledgerId);
    return this.prisma.assetGroup.findMany({
      where: { ledgerId },
      include: {
        assets: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });
  }

  async createGroup(userId: string, ledgerId: string, dto: CreateAssetGroupDto) {
    await this.ensureEditor(userId, ledgerId);

    const existing = await this.prisma.assetGroup.findFirst({
      where: {
        ledgerId,
        name: dto.name,
      },
    });

    if (existing) {
      throw new BadRequestException('이미 존재하는 그룹 이름입니다.');
    }

    const maxOrder = await this.prisma.assetGroup.aggregate({
      where: { ledgerId, type: dto.type },
      _max: {
        sortOrder: true,
      },
    });

    return this.prisma.assetGroup.create({
      data: {
        ledgerId,
        name: dto.name,
        type: dto.type,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
  }

  async updateGroup(userId: string, groupId: string, dto: UpdateAssetGroupDto) {
    const group = await this.prisma.assetGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('자산 그룹을 찾을 수 없습니다.');
    }

    await this.ensureEditor(userId, group.ledgerId);

    return this.prisma.assetGroup.update({
      where: { id: groupId },
      data: dto,
    });
  }

  async reorderGroups(userId: string, ledgerId: string, dto: ReorderItemsDto) {
    await this.ensureEditor(userId, ledgerId);

    return this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.assetGroup.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );
  }

  async deleteGroup(userId: string, groupId: string) {
    const group = await this.prisma.assetGroup.findUnique({
      where: { id: groupId },
      include: {
        assets: true,
      },
    });

    if (!group) {
      throw new NotFoundException('자산 그룹을 찾을 수 없습니다.');
    }

    if (group.assets.length > 0) {
      throw new BadRequestException('연결된 자산이 있는 그룹은 삭제할 수 없습니다.');
    }

    await this.ensureEditor(userId, group.ledgerId);

    return this.prisma.assetGroup.delete({
      where: { id: groupId },
    });
  }

  async createAsset(userId: string, ledgerId: string, dto: CreateAssetDto) {
    await this.ensureEditor(userId, ledgerId);
    await this.ensureGroupBelongsToLedger(dto.groupId, ledgerId);

    if (dto.type === AssetType.CREDIT_CARD) {
      if (dto.billingDay == null || dto.billingDay < 1 || dto.billingDay > 31) {
        throw new BadRequestException('신용카드의 결제일을 설정해주세요.');
      }
    }

    const maxOrder = await this.prisma.asset.aggregate({
      where: { ledgerId, groupId: dto.groupId },
      _max: {
        sortOrder: true,
      },
    });

    return this.prisma.asset.create({
      data: {
        ledgerId,
        groupId: dto.groupId,
        name: dto.name,
        type: dto.type,
        initialAmount: dto.initialAmount,
        includeInNetWorth: dto.includeInNetWorth,
        billingDay: dto.billingDay ?? null,
        upcomingPaymentAmount: dto.upcomingPaymentAmount ?? null,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
  }

  async updateAsset(userId: string, assetId: string, dto: UpdateAssetDto) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundException('자산을 찾을 수 없습니다.');
    }

    await this.ensureEditor(userId, asset.ledgerId);

    if (dto.groupId) {
      await this.ensureGroupBelongsToLedger(dto.groupId, asset.ledgerId);
    }

    if (dto.type === AssetType.CREDIT_CARD) {
      if (dto.billingDay == null || dto.billingDay < 1 || dto.billingDay > 31) {
        throw new BadRequestException('신용카드의 결제일을 설정해주세요.');
      }
    }

    return this.prisma.asset.update({
      where: { id: assetId },
      data: {
        name: dto.name,
        type: dto.type,
        groupId: dto.groupId ?? asset.groupId,
        initialAmount: dto.initialAmount,
        includeInNetWorth: dto.includeInNetWorth,
        billingDay:
          dto.billingDay !== undefined ? dto.billingDay : asset.billingDay,
        upcomingPaymentAmount:
          dto.upcomingPaymentAmount !== undefined
            ? dto.upcomingPaymentAmount
            : asset.upcomingPaymentAmount,
        sortOrder: dto.sortOrder ?? asset.sortOrder,
      },
    });
  }

  async reorderAssets(userId: string, ledgerId: string, dto: ReorderItemsDto) {
    await this.ensureEditor(userId, ledgerId);

    return this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.asset.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );
  }

  async deleteAsset(userId: string, assetId: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundException('자산을 찾을 수 없습니다.');
    }

    await this.ensureEditor(userId, asset.ledgerId);

    return this.prisma.asset.delete({
      where: { id: assetId },
    });
  }

  private async ensureMember(userId: string, ledgerId: string) {
    const membership = await this.prisma.ledgerMember.findFirst({
      where: { ledgerId, userId },
    });

    if (!membership) {
      throw new ForbiddenException('가계부 접근 권한이 없습니다.');
    }
  }

  private async ensureEditor(userId: string, ledgerId: string) {
    const membership = await this.prisma.ledgerMember.findFirst({
      where: { ledgerId, userId },
    });

    if (!membership) {
      throw new ForbiddenException('가계부 접근 권한이 없습니다.');
    }

    if (
      membership.role !== LedgerMemberRole.OWNER &&
      membership.role !== LedgerMemberRole.EDITOR
    ) {
      throw new ForbiddenException('편집 권한이 없습니다.');
    }
  }

  private async ensureGroupBelongsToLedger(groupId: string, ledgerId: string) {
    const group = await this.prisma.assetGroup.findUnique({
      where: { id: groupId },
    });

    if (!group || group.ledgerId !== ledgerId) {
      throw new BadRequestException('유효하지 않은 자산 그룹입니다.');
    }
  }
}
