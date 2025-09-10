import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type TxType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

interface CreateTxInput {
  ledgerId: string;
  userId: string;
  type: TxType;
  date: string;
  amount: number;
  memo?: string;
  assetId?: string;
  counterAssetId?: string;
  categoryId?: string;    
  currency?: string;
  fxRate?: number | null;
}

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async listByLedger(ledgerId: string, from?: string, to?: string) {
    const where: any = { ledgerId };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }
    return this.prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        asset: true,
        counterAsset: true,
        splits: { include: { category: true } },
        tags: { include: { tag: true } },
      },
    });
  }

    async createBasic(input: CreateTxInput) {
    const { ledgerId, userId, type, date, amount } = input;
    if (!ledgerId || !userId) throw new BadRequestException('ledgerId/userId 누락');
    if (!type || !['INCOME', 'EXPENSE', 'TRANSFER'].includes(type)) {
        throw new BadRequestException('type은 INCOME|EXPENSE|TRANSFER');
    }
    if (!date || isNaN(Date.parse(date))) throw new BadRequestException('date 형식 오류');
    if (!amount || amount <= 0) throw new BadRequestException('amount는 1 이상');

    if (type === 'TRANSFER') {
        if (!input.assetId || !input.counterAssetId) {
        throw new BadRequestException('이체는 assetId와 counterAssetId를 모두 보내야 합니다.');
        }
        if (input.assetId === input.counterAssetId) {
        throw new BadRequestException('동일 자산 간 이체는 불가합니다.');
        }
    } else {
        if (!input.assetId) {
        throw new BadRequestException(`${type} 거래는 assetId가 필요합니다.`);
        }
    }

    const asset = input.assetId
        ? await this.prisma.asset.findFirst({ where: { id: input.assetId, ledgerId } })
        : null;
    const counter = input.counterAssetId
        ? await this.prisma.asset.findFirst({ where: { id: input.counterAssetId, ledgerId } })
        : null;

    if ((type === 'INCOME' || type === 'EXPENSE') && !asset) {
        const exists = input.assetId
        ? await this.prisma.asset.findUnique({ where: { id: input.assetId } })
        : null;
        if (!exists) throw new BadRequestException('assetId에 해당하는 자산을 찾을 수 없습니다.');
        throw new BadRequestException('선택한 자산은 해당 가계부(ledger)에 속하지 않습니다.');
    }
    if (type === 'TRANSFER') {
        if (!asset) {
        const exists = await this.prisma.asset.findUnique({ where: { id: input.assetId! } });
        if (!exists) throw new BadRequestException('assetId(보내는 자산)를 찾을 수 없습니다.');
        throw new BadRequestException('보내는 자산이 해당 가계부에 속하지 않습니다.');
        }
        if (!counter) {
        const exists = await this.prisma.asset.findUnique({ where: { id: input.counterAssetId! } });
        if (!exists) throw new BadRequestException('counterAssetId(받는 자산)를 찾을 수 없습니다.');
        throw new BadRequestException('받는 자산이 해당 가계부에 속하지 않습니다.');
        }
    }

    return await this.prisma.$transaction(async (tx) => {
        const created = await tx.transaction.create({
        data: {
            ledgerId,
            userId,
            type,
            date: new Date(date),
            amount,
            memo: input.memo ?? null,
            assetId: asset?.id ?? null,
            counterAssetId: counter?.id ?? null,
            currency: input.currency ?? 'KRW',
            fxRate: input.fxRate ?? null,
        },
        });

        // 잔액 반영
        if (type === 'INCOME') {
        await tx.asset.update({ where: { id: asset!.id }, data: { currentBalance: { increment: amount } } });
        } else if (type === 'EXPENSE') {
        await tx.asset.update({ where: { id: asset!.id }, data: { currentBalance: { decrement: amount } } });
        } else if (type === 'TRANSFER') {
        await tx.asset.update({ where: { id: asset!.id }, data: { currentBalance: { decrement: amount } } });
        await tx.asset.update({ where: { id: counter!.id }, data: { currentBalance: { increment: amount } } });
        }

        if (input.categoryId && (type === 'INCOME' || type === 'EXPENSE')) {
        await tx.transactionSplit.create({
            data: {
            transactionId: created.id,
            categoryId: input.categoryId,
            amount,
            memo: null,
            },
        });
        }

        return created;
    });
    }

}
