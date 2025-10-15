import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RecurringService {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: implement recurring rule CRUD, scheduler hooks, and instance tracking.
}
