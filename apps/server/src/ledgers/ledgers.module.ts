import { Module } from '@nestjs/common';
import { LedgersService } from './ledgers.service';
import { LedgersController } from './ledgers.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [LedgersController],
  providers: [LedgersService],
  exports: [LedgersService],
})
export class LedgersModule {}
