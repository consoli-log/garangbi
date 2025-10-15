import { Controller } from '@nestjs/common';
import { BudgetsService } from './budgets.service';

@Controller('ledgers/:ledgerId/budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  // TODO: add endpoints for managing monthly budgets and returning consumption summaries.
}
