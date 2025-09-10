import { Body, Controller, Get, Headers, Param, Post, Query, BadRequestException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtService } from '@nestjs/jwt';

@Controller()
export class TransactionsController {
  constructor(
    private readonly service: TransactionsService,
    private readonly jwt: JwtService
  ) {}

  private getUserIdFromAuth(auth?: string): string {
    const token = auth?.split(' ')[1];
    if (!token) throw new BadRequestException('Authorization 토큰 필요');
    const payload: any = this.jwt.verify(token, { secret: process.env.JWT_SECRET! });
    return payload.sub as string;
  }

  @Get('ledgers/:ledgerId/transactions')
  async list(
    @Param('ledgerId') ledgerId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.listByLedger(ledgerId, from, to);
  }

  @Post('ledgers/:ledgerId/transactions')
  async createBasic(
    @Param('ledgerId') ledgerId: string,
    @Headers('authorization') auth?: string,
    @Body() body?: any,
  ) {
    const userId = this.getUserIdFromAuth(auth);
    return this.service.createBasic({
      ledgerId,
      userId,
      type: body?.type,
      date: body?.date,
      amount: Number(body?.amount),
      memo: body?.memo,
      assetId: body?.assetId ?? null,
      counterAssetId: body?.counterAssetId ?? null,
      categoryId: body?.categoryId ?? null,
      currency: body?.currency ?? 'KRW',
      fxRate: body?.fxRate ?? null,
    });
  }
}
