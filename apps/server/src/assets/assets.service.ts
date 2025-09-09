import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async listByLedger(ledgerId: string) {
    const groups = await this.prisma.assetGroup.findMany({
      where: { ledgerId },
      orderBy: { order: 'asc' },
      include: {
        assets: { orderBy: { order: 'asc' } },
      },
    });
    return groups;
  }

  // 그룹
  async createGroup(ledgerId: string, name: string, type: 'ASSET' | 'DEBT' = 'ASSET') {
    const max = await this.prisma.assetGroup.aggregate({
      where: { ledgerId },
      _max: { order: true },
    });
    return this.prisma.assetGroup.create({
      data: {
        ledgerId,
        name,
        type,
        order: (max._max.order ?? -1) + 1,
      },
    });
  }

  async updateGroup(id: string, data: { name?: string; type?: 'ASSET' | 'DEBT' }) {
    return this.prisma.assetGroup.update({
      where: { id },
      data,
    });
  }

  async deleteGroup(id: string) {
    await this.prisma.asset.updateMany({
      where: { groupId: id },
      data: { groupId: { set: null } },
    });
    return this.prisma.assetGroup.delete({ where: { id } });
  }

  async reorderGroups(ledgerId: string, orders: { id: string; order: number }[]) {
    const tx: Prisma.PrismaPromise<any>[] = orders.map((o) =>
      this.prisma.assetGroup.update({ where: { id: o.id }, data: { order: o.order } }),
    );
    await this.prisma.$transaction(tx);
    return this.listByLedger(ledgerId);
  }

  // 자산
  async createAsset(input: {
    ledgerId: string;
    groupId?: string | null;
    name: string;
    kind: string; // CASH | BANK | CARD | LOAN | INVEST ...
    initialBalance?: number;
    includeInNetWorth?: boolean;
    cardBillingDay?: number | null;
    nextBillingAmount?: number | null;
  }) {
    const max = await this.prisma.asset.aggregate({
      where: { ledgerId: input.ledgerId, groupId: input.groupId ?? null },
      _max: { order: true },
    });

    const initial = input.initialBalance ?? 0;

    return this.prisma.asset.create({
      data: {
        ledgerId: input.ledgerId,
        groupId: input.groupId ?? null,
        name: input.name,
        kind: input.kind,
        initialBalance: initial,
        currentBalance: initial,
        includeInNetWorth: input.includeInNetWorth ?? true,
        cardBillingDay: input.cardBillingDay ?? null,
        nextBillingAmount: input.nextBillingAmount ?? null,
        order: (max._max.order ?? -1) + 1,
      },
    });
  }

  async updateAsset(
    id: string,
    data: Partial<{
      groupId: string | null;
      name: string;
      kind: string;
      includeInNetWorth: boolean;
      cardBillingDay: number | null;
      nextBillingAmount: number | null;
    }>,
  ) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('자산을 찾을 수 없습니다.');

    const groupIdPatch =
      Object.prototype.hasOwnProperty.call(data, 'groupId')
        ? { groupId: { set: data.groupId ?? null } }
        : {};

    return this.prisma.asset.update({
      where: { id },
      data: {
        name: data.name,
        kind: data.kind,
        includeInNetWorth: data.includeInNetWorth,
        cardBillingDay: data.cardBillingDay ?? undefined,
        nextBillingAmount: data.nextBillingAmount ?? undefined,
        ...groupIdPatch,
      },
    });
  }

  async deleteAsset(id: string) {
    return this.prisma.asset.delete({ where: { id } });
  }

  async reorderAssets(ledgerId: string, items: { id: string; order: number }[]) {
    const tx: Prisma.PrismaPromise<any>[] = items.map((it) =>
      this.prisma.asset.update({ where: { id: it.id }, data: { order: it.order } }),
    );
    await this.prisma.$transaction(tx);
    return this.listByLedger(ledgerId);
  }
}
