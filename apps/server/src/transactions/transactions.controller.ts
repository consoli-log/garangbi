import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionFilterDto } from './dto/transaction-filter.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@UseGuards(AuthGuard('jwt'))
@Controller()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get('ledgers/:ledgerId/transactions')
  listTransactions(
    @Req() req,
    @Param('ledgerId') ledgerId: string,
    @Query() filter: TransactionFilterDto,
  ) {
    return this.transactionsService.listTransactions(req.user.id, ledgerId, filter);
  }

  @Post('ledgers/:ledgerId/transactions')
  createTransaction(
    @Req() req,
    @Param('ledgerId') ledgerId: string,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionsService.createTransaction(req.user.id, ledgerId, dto);
  }

  @Get('ledgers/:ledgerId/transactions/:transactionId')
  getTransaction(
    @Req() req,
    @Param('ledgerId') ledgerId: string,
    @Param('transactionId') transactionId: string,
  ) {
    return this.transactionsService.getTransaction(req.user.id, ledgerId, transactionId);
  }

  @Patch('ledgers/:ledgerId/transactions/:transactionId')
  updateTransaction(
    @Req() req,
    @Param('ledgerId') ledgerId: string,
    @Param('transactionId') transactionId: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactionsService.updateTransaction(
      req.user.id,
      ledgerId,
      transactionId,
      dto,
    );
  }

  @Delete('ledgers/:ledgerId/transactions/:transactionId')
  deleteTransaction(
    @Req() req,
    @Param('ledgerId') ledgerId: string,
    @Param('transactionId') transactionId: string,
  ) {
    return this.transactionsService.deleteTransaction(req.user.id, ledgerId, transactionId);
  }

  @Post('ledgers/:ledgerId/transactions/:transactionId/comments')
  createComment(
    @Req() req,
    @Param('ledgerId') ledgerId: string,
    @Param('transactionId') transactionId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.transactionsService.createComment(
      req.user.id,
      ledgerId,
      transactionId,
      dto,
    );
  }

  @Patch('ledgers/:ledgerId/transactions/:transactionId/comments/:commentId')
  updateComment(
    @Req() req,
    @Param('ledgerId') ledgerId: string,
    @Param('transactionId') transactionId: string,
    @Param('commentId') commentId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.transactionsService.updateComment(
      req.user.id,
      ledgerId,
      transactionId,
      commentId,
      dto,
    );
  }

  @Delete('ledgers/:ledgerId/transactions/:transactionId/comments/:commentId')
  deleteComment(
    @Req() req,
    @Param('ledgerId') ledgerId: string,
    @Param('transactionId') transactionId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.transactionsService.deleteComment(
      req.user.id,
      ledgerId,
      transactionId,
      commentId,
    );
  }
}
