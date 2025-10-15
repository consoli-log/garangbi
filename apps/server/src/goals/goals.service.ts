import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: implement goal CRUD operations and contribution linkage.
}
