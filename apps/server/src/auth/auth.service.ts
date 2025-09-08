import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async register(email: string, nickname: string, password: string) {
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new BadRequestException('이미 사용 중인 이메일입니다.');
    const passwordHash = await argon2.hash(password);
    const user = await this.prisma.user.create({
      data: { email, nickname, passwordHash, isActive: true }
    });
    return { id: user.id };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');

    await this.ensureDefaultSeed(user.id);

    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email });
    return { accessToken, user: { id: user.id, email: user.email, nickname: user.nickname } };
  }

  private async ensureDefaultSeed(userId: string) {
    const hasLedger = await this.prisma.ledger.findFirst({ where: { ownerId: userId } });
    if (hasLedger) return;

    await this.prisma.$transaction(async (tx) => {
      const ledger = await tx.ledger.create({
        data: {
          name: '개인 가계부',
          description: '기본 생성된 가계부',
          currency: 'KRW',
          startDay: 1,
          isDefault: true,
          ownerId: userId
        }
      });

      const assetGroupCash = await tx.assetGroup.create({
        data: { ledgerId: ledger.id, name: '현금', type: 'ASSET', order: 1 }
      });
      const assetGroupBank = await tx.assetGroup.create({
        data: { ledgerId: ledger.id, name: '은행', type: 'ASSET', order: 2 }
      });

      await tx.asset.create({
        data: {
          ledgerId: ledger.id,
          groupId: assetGroupCash.id,
          name: '현금',
          kind: 'CASH',
          initialBalance: 0,
          includeInNetWorth: true,
          order: 1
        }
      });
      await tx.asset.create({
        data: {
          ledgerId: ledger.id,
          groupId: assetGroupBank.id,
          name: '주계좌',
          kind: 'BANK',
          initialBalance: 0,
          includeInNetWorth: true,
          order: 2
        }
      });

      const catFood = await tx.category.create({
        data: { ledgerId: ledger.id, kind: 'EXPENSE', name: '식비', order: 1 }
      });
      await tx.category.create({
        data: { ledgerId: ledger.id, kind: 'EXPENSE', name: '카페', parentId: catFood.id, order: 1 }
      });
      await tx.category.create({
        data: { ledgerId: ledger.id, kind: 'EXPENSE', name: '교통', order: 2 }
      });

      await tx.category.create({
        data: { ledgerId: ledger.id, kind: 'INCOME', name: '급여', order: 1 }
      });
    });
  }
}
