import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LedgersModule } from '../ledgers/ledgers.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, LedgersModule, AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
