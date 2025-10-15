import { Controller } from '@nestjs/common';
import { TransactionsService } from './transactions.service';

@Controller('ledgers/:ledgerId/transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  // TODO: add endpoints for create/list/update/delete transactions and split/tag helpers.
}
