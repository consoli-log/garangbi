import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: implement budget creation, updates, and reporting helpers.
}
