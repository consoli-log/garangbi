-- Create enums for transaction, tagging, budgeting, recurring rules, and digests
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');
CREATE TYPE "TransactionStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'SOFT_DELETED');
CREATE TYPE "TagType" AS ENUM ('CUSTOM', 'SYSTEM');
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'ACHIEVED', 'ARCHIVED');
CREATE TYPE "BudgetBasis" AS ENUM ('CATEGORY', 'ASSET', 'CATEGORY_ASSET');
CREATE TYPE "RecurringInterval" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');
CREATE TYPE "RecurringStatus" AS ENUM ('SCHEDULED', 'POSTED', 'SKIPPED');
CREATE TYPE "DigestType" AS ENUM ('WEEKLY', 'MONTHLY');

-- Transactions and supporting tables
CREATE TABLE "Transaction" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ledgerId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "relatedAssetId" TEXT,
  "categoryId" TEXT,
  "recurringRuleId" TEXT,
  "createdById" TEXT NOT NULL,
  "type" "TransactionType" NOT NULL,
  "status" "TransactionStatus" NOT NULL DEFAULT 'ACTIVE',
  "transactionDate" TIMESTAMP(3) NOT NULL,
  "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "amount" INTEGER NOT NULL,
  "memo" TEXT,
  "note" TEXT,
  "photoUrl" TEXT,
  "receiptId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "TransactionSplit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "transactionId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "memo" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Tag" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ledgerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "TagType" NOT NULL DEFAULT 'CUSTOM',
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Tag_ledgerId_name_key" ON "Tag"("ledgerId", "name");

CREATE TABLE "TransactionTag" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "transactionId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL
);

CREATE UNIQUE INDEX "TransactionTag_transactionId_tagId_key" ON "TransactionTag"("transactionId", "tagId");

CREATE TABLE "TransactionAttachment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "transactionId" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "thumbnailUrl" TEXT,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Goal & contribution tables
CREATE TABLE "Goal" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ledgerId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "targetAmount" INTEGER NOT NULL,
  "currentAmount" INTEGER NOT NULL DEFAULT 0,
  "targetDate" TIMESTAMP(3),
  "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
  "achievedAt" TIMESTAMP(3),
  "coverImageUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "GoalContribution" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "goalId" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Budgeting tables
CREATE TABLE "Budget" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ledgerId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "basis" "BudgetBasis" NOT NULL,
  "currency" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Budget_ledgerId_year_month_basis_key" ON "Budget"("ledgerId", "year", "month", "basis");

CREATE TABLE "BudgetItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "budgetId" TEXT NOT NULL,
  "parentItemId" TEXT,
  "categoryId" TEXT,
  "assetId" TEXT,
  "amount" INTEGER NOT NULL,
  "path" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Recurring rules & instances
CREATE TABLE "RecurringRule" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ledgerId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "categoryId" TEXT,
  "createdById" TEXT NOT NULL,
  "title" TEXT,
  "amount" INTEGER NOT NULL,
  "type" "TransactionType" NOT NULL,
  "interval" "RecurringInterval" NOT NULL,
  "dayOfMonth" INTEGER,
  "dayOfWeek" INTEGER,
  "monthOfYear" INTEGER,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "leadTimeDays" INTEGER DEFAULT 0,
  "note" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "nextRunAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "RecurringInstance" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ruleId" TEXT NOT NULL,
  "transactionId" TEXT,
  "scheduledDate" TIMESTAMP(3) NOT NULL,
  "status" "RecurringStatus" NOT NULL DEFAULT 'SCHEDULED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Activity log & notifications
CREATE TABLE "LedgerActivityLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ledgerId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "UserNotificationSetting" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "weeklyDigest" BOOLEAN NOT NULL DEFAULT FALSE,
  "monthlyDigest" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "UserNotificationSetting_userId_key" ON "UserNotificationSetting"("userId");

CREATE TABLE "ScheduledDigest" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" "DigestType" NOT NULL,
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3)
);

-- Foreign keys
ALTER TABLE "Transaction"
  ADD CONSTRAINT "Transaction_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Transaction_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Transaction_relatedAssetId_fkey" FOREIGN KEY ("relatedAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Transaction_recurringRuleId_fkey" FOREIGN KEY ("recurringRuleId") REFERENCES "RecurringRule"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Transaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TransactionSplit"
  ADD CONSTRAINT "TransactionSplit_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "TransactionSplit_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Tag"
  ADD CONSTRAINT "Tag_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TransactionTag"
  ADD CONSTRAINT "TransactionTag_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "TransactionTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TransactionAttachment"
  ADD CONSTRAINT "TransactionAttachment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Goal"
  ADD CONSTRAINT "Goal_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Goal_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GoalContribution"
  ADD CONSTRAINT "GoalContribution_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "GoalContribution_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Budget"
  ADD CONSTRAINT "Budget_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BudgetItem"
  ADD CONSTRAINT "BudgetItem_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "BudgetItem_parentItemId_fkey" FOREIGN KEY ("parentItemId") REFERENCES "BudgetItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "BudgetItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "BudgetItem_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RecurringRule"
  ADD CONSTRAINT "RecurringRule_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "RecurringRule_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "RecurringRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "RecurringRule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RecurringInstance"
  ADD CONSTRAINT "RecurringInstance_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "RecurringRule"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "RecurringInstance_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LedgerActivityLog"
  ADD CONSTRAINT "LedgerActivityLog_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "LedgerActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserNotificationSetting"
  ADD CONSTRAINT "UserNotificationSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScheduledDigest"
  ADD CONSTRAINT "ScheduledDigest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
