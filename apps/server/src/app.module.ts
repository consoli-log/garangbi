import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { LedgersModule } from './ledgers/ledgers.module';
import { AssetsModule } from './assets/assets.module';
import { CategoriesModule } from './categories/categories.module';
import { TransactionsModule } from './transactions/transactions.module';
import { BudgetsModule } from './budgets/budgets.module';
import { GoalsModule } from './goals/goals.module';
import { RecurringModule } from './recurring/recurring.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    LedgersModule,
    AssetsModule,
    CategoriesModule,
    TransactionsModule,
    BudgetsModule,
    GoalsModule,
    RecurringModule,
  ],
})
export class AppModule {}
