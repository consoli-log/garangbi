import { Controller } from '@nestjs/common';
import { RecurringService } from './recurring.service';

@Controller('ledgers/:ledgerId/recurring-rules')
export class RecurringController {
  constructor(private readonly recurringService: RecurringService) {}

  // TODO: add endpoints for managing recurring transaction rules and upcoming instances.
}
