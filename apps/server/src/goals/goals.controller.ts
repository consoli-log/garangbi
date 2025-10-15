import { Controller } from '@nestjs/common';
import { GoalsService } from './goals.service';

@Controller('ledgers/:ledgerId/goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  // TODO: add endpoints for goal creation, progress updates, and contribution history.
}
