import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}
  me(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, nickname: true } });
  }
}
